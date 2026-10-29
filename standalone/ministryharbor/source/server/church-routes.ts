import type {} from 'express-session';
declare module 'express-session' { interface SessionData { isAdmin?: boolean; } }
import type {Express,Request,Response,NextFunction} from 'express';
import {storage} from './storage';
import {db} from './db';
import {eq,sql,desc,gte} from 'drizzle-orm';
import {z} from 'zod';
import {randomBytes} from 'node:crypto';
import {churchTransactions} from '@shared/schema';
import {auth} from './firebase-admin';
import {sendChurchWelcomeEmail,sendChurchNameChangeSecurityEmail,sendChurchComplianceEmail} from './sendgrid';
const ADMIN_PASSWORD = undefined;
const verifyFirebaseToken = async (token:string) => (await auth.verifyIdToken(token)).uid;
function requireUser(req:Request,res:Response,next:NextFunction){
  const token=req.headers.authorization?.replace(/^Bearer /,'');
  if(!token)return res.status(401).json({message:'Please sign in.'});
  auth.verifyIdToken(token).then(p=>{(req as any).uid=p.uid;next();}).catch(()=>res.status(401).json({message:'Invalid sign-in session.'}));
}
function requireAdmin(_req:Request,res:Response){return res.status(503).json({message:'Platform administration is not enabled in this build.'});}
export function registerChurchRoutes(app:Express){
async function getUid(req: Request, res?: Response): Promise<string | null> {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) {
      if (res) res.status(401).json({ message: "Your sign-in session was not included. Please refresh the page and try again." });
      return null;
    }
    try {
      return await verifyFirebaseToken(h.slice(7));
    } catch {
      if (res) res.status(401).json({ message: "Your session has expired. Please sign in again." });
      return null;
    }
  }
function churchSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 40)
      + "-" + Math.random().toString(36).substring(2, 6);
  }
function inviteCode() {
    // Readable format: 3 letters + dash + 4 digits, e.g. "AXJ-4823"
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "0123456789";
    const letters = Array.from({ length: 3 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");
    const nums = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join("");
    return `${letters}-${nums}`;
  }
app.get("/api/church-invite/:code", async (req, res) => {
    try {
      const code = req.params.code.toUpperCase().replace(/\s/g, "");
      const inv = await storage.getChurchInvitation(code);
      if (inv && inv.isActive) {
        if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return res.status(410).json({ message: "Invitation has expired" });
        if (inv.maxUses && inv.approvedUses >= inv.maxUses) return res.status(410).json({ message: "Invitation has reached its limit" });
        const church = await storage.getChurch(inv.churchId);
        if (!church) return res.status(404).json({ message: "Church not found" });
        // Platform governance gate: invitations are only usable for approved orgs
        if (church.platformStatus !== "approved") return res.status(403).json({ message: "This organization is not currently active on the platform" });
        let groupName: string | null = inv.targetGroupName ?? null;
        if (!groupName && inv.targetGroupId) {
          const groups = await storage.getChurchGroups(inv.churchId);
          groupName = groups.find(g => g.id === inv.targetGroupId)?.name ?? null;
        }
        return res.json({
          church: { id: church.id, name: church.name, slug: church.slug, description: church.description, logoUrl: church.logoUrl, denomination: church.denomination, approvalMode: church.approvalMode },
          invitation: {
            id: inv.id, label: inv.label, expiresAt: inv.expiresAt,
            invitationType: inv.invitationType, targetGroupId: inv.targetGroupId,
            targetGroupName: groupName, maxUses: inv.maxUses,
            approvedUses: inv.approvedUses, remaining: inv.maxUses ? Math.max(0, inv.maxUses - inv.approvedUses) : null,
          },
        });
      }
      // Fallback: check department invite codes
      const dept = await storage.getDepartmentByInviteCode(code);
      if (!dept || !dept.isActive) return res.status(404).json({ message: "Invitation not found or no longer active" });
      const church = await storage.getChurch(dept.churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      // Platform governance gate: department invites are also only usable for approved orgs
      if (church.platformStatus !== "approved") return res.status(403).json({ message: "This organization is not currently active on the platform" });
      return res.json({
        church: { id: church.id, name: church.name, slug: church.slug, description: church.description, logoUrl: church.logoUrl, denomination: church.denomination, approvalMode: church.approvalMode },
        invitation: {
          id: dept.id, label: dept.name, expiresAt: null,
          invitationType: "department", targetGroupId: dept.id,
          targetGroupName: dept.name, maxUses: null,
          approvedUses: 0, remaining: null,
        },
        isDepartmentInvite: true,
        deptId: dept.id,
      });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const { name, description, denomination, address, websiteUrl, email, displayName } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Church name is required" });
      let slug = churchSlug(name.trim());
      for (let i = 0; i < 5 && await storage.getChurchBySlug(slug); i++) slug = churchSlug(name.trim());
      const church = await storage.createChurch({ name: name.trim(), slug, description: description?.trim() || null, denomination: denomination?.trim() || null, address: address?.trim() || null, websiteUrl: websiteUrl?.trim() || null, logoUrl: null, ownerId: uid, status: "active", platformStatus: "draft" });
      await storage.addChurchMember({ churchId: church.id, firebaseUid: uid, email: email || "", displayName: displayName || null, role: "owner", status: "active" });
      res.status(201).json(church);
      // Non-blocking welcome email — fires after response so registration is never delayed
      if (email) {
        sendChurchWelcomeEmail(email, displayName || email, church.name, church.platformStatus ?? "draft", "en")
          .then(r => {
            if (!r.success) storage.createAuditLog({ churchId: church.id, action: "email_failed", newValue: `welcome:${r.status.slice(0,200)}`, actorUid: uid }).catch(() => {});
          }).catch(() => {});
      }
    } catch (err) { console.error("Create church:", err); res.status(500).json({ message: "Failed to create church" }); }
  });
app.get("/api/churches/my", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try { res.json(await storage.getUserChurches(uid)); } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/join", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const { inviteCode: code, email, displayName } = req.body;
      if (!code?.trim()) return res.status(400).json({ message: "Invite code is required" });
      const inv = await storage.getChurchInvitation(code.trim().toUpperCase().replace(/\s/g, ""));
      if (!inv || !inv.isActive) return res.status(404).json({ message: "Invalid or expired invitation code" });
      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return res.status(410).json({ message: "This invitation has expired" });
      // Server-side atomic limit check using approvedUses (only counts approved members)
      if (inv.maxUses && inv.approvedUses >= inv.maxUses) return res.status(410).json({ message: "This invitation has reached its maximum uses" });
      const church = await storage.getChurch(inv.churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      // Platform governance gate: block joins to non-approved orgs
      if (church.platformStatus !== "approved") return res.status(403).json({ message: "This organization is not currently accepting new members" });
      const already = await storage.getChurchMember(inv.churchId, uid);
      if (already?.status === "active") return res.json({ message: "Already a member", church });
      if (already?.status === "pending") return res.json({ message: "Your membership request is pending approval", pending: true, church });
      // Determine initial status based on church approvalMode
      const initialStatus = church.approvalMode === "auto_approve" ? "active" : "pending";
      await storage.addChurchMember({
        churchId: inv.churchId, firebaseUid: uid, email: email || "",
        displayName: displayName || null, role: "member", status: initialStatus,
        invitedGroupId: inv.targetGroupId ?? null,
        inviteCodeUsed: inv.inviteCode,
      });
      // Only increment approvedUses if auto-approved
      if (initialStatus === "active") {
        await storage.approveChurchInvitationUse(inv.inviteCode);
        // Assign to group if targeted
        if (inv.targetGroupId) {
          try {
            await storage.addChurchGroupMember({ groupId: inv.targetGroupId, firebaseUid: uid, displayName: displayName || null, email: email || "" });
          } catch { /* group may not exist */ }
        }
      }
      await storage.useChurchInvitation(inv.inviteCode);
      res.json({
        message: initialStatus === "pending" ? "Your request to join has been sent and is awaiting approval." : "Joined successfully",
        pending: initialStatus === "pending",
        church,
      });
    } catch (err) { console.error("Join church:", err); res.status(500).json({ message: "Failed to join church" }); }
  });
app.post("/api/churches/:id/members/:memberId/approve", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const memberId = Number(req.params.memberId);
      const requester = await storage.getChurchMember(churchId, uid);
      if (!requester || !["owner", "lead_pastor", "administrator"].includes(requester.role)) return res.status(403).json({ message: "Not authorized" });
      const all = await storage.getChurchMembers(churchId);
      const target = all.find(m => m.id === memberId);
      if (!target || target.status !== "pending") return res.status(404).json({ message: "Pending member not found" });
      // Check invitation limit before approving
      if (target.inviteCodeUsed) {
        const inv = await storage.getChurchInvitation(target.inviteCodeUsed);
        if (inv && inv.maxUses && inv.approvedUses >= inv.maxUses) return res.status(409).json({ message: "Invitation limit reached — cannot approve this member" });
        if (inv) await storage.approveChurchInvitationUse(inv.inviteCode);
      }
      const updated = await storage.updateChurchMemberStatus(memberId, "active");
      // Assign to group if invitation targeted one
      if (target.invitedGroupId) {
        try {
          await storage.addChurchGroupMember({ groupId: target.invitedGroupId, firebaseUid: target.firebaseUid, displayName: target.displayName, email: target.email });
        } catch { /* already in group */ }
      }
      storage.createAuditLog({ churchId, action: "member_approved", newValue: target.email ?? target.displayName ?? String(memberId), actorUid: uid, actorRole: requester.role }).catch(() => {});
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to approve member" }); }
  });
app.post("/api/churches/:id/members/:memberId/decline", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const memberId = Number(req.params.memberId);
      const requester = await storage.getChurchMember(churchId, uid);
      if (!requester || !["owner", "lead_pastor", "administrator"].includes(requester.role)) return res.status(403).json({ message: "Not authorized" });
      const all = await storage.getChurchMembers(churchId);
      const target = all.find(m => m.id === memberId);
      const updated = await storage.updateChurchMemberStatus(memberId, "declined");
      storage.createAuditLog({ churchId, action: "member_declined", newValue: target?.email ?? target?.displayName ?? String(memberId), actorUid: uid, actorRole: requester.role }).catch(() => {});
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to decline member" }); }
  });
app.get("/api/churches/slug/:slug", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active") return res.status(404).json({ message: "Church not found" });

      // For authenticated members of this church, allow access regardless of platformStatus
      // so admins/owners can still manage their org during review.
      // For everyone else (unauthenticated or non-members), require platformStatus === approved.
      const uid = req.headers.authorization?.startsWith("Bearer ")
        ? await (async () => {
            try {
              const decoded = await auth.verifyIdToken(req.headers.authorization!.slice(7));
              return decoded.uid;
            } catch { return null; }
          })()
        : null;
      if (!uid || !(await storage.getChurchMember(church.id, uid))) {
        // Non-member or unauthenticated — only expose if platform-approved
        if (church.platformStatus !== "approved") return res.status(404).json({ message: "Church not found" });
      }

      res.json(church);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/public/churches/:slug", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active" || church.publicWebsiteEnabled === false || church.platformStatus !== "approved") {
        return res.status(404).json({ message: "Church not found" });
      }
      const [sermons, announcements, departments] = await Promise.all([
        storage.getChurchSermons(church.id),
        storage.getChurchAnnouncements(church.id),
        storage.getDepartments(church.id),
      ]);
      const recentSermons = sermons.filter((s: any) => s.isPublished).slice(0, 6);
      const recentAnnouncements = announcements.slice(0, 6);
      res.json({ church, recentSermons, recentAnnouncements, departments });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/public/churches/:slug/sermons", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active" || church.platformStatus !== "approved") return res.status(404).json({ message: "Church not found" });
      const sermons = await storage.getChurchSermons(church.id);
      res.json({ sermons: sermons.filter((s: any) => s.isPublished) });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/public/churches/:slug/events", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active" || church.platformStatus !== "approved") return res.status(404).json({ message: "Church not found" });
      const departments = await storage.getDepartments(church.id);
      const eventArrays = await Promise.all(departments.map(d => storage.getDepartmentEvents(d.id)));
      const events = eventArrays.flat().sort((a: any, b: any) =>
        new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime()
      );
      res.json({ events });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/public/churches/:slug/prayer", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active" || church.platformStatus !== "approved") return res.status(404).json({ message: "Church not found" });
      const { name, email, request } = req.body;
      if (!name?.trim() || !request?.trim()) return res.status(400).json({ message: "Name and request are required" });
      const prayer = await storage.createChurchPrayerRequest({
        churchId: church.id,
        firebaseUid: `public_${Date.now()}`,
        displayName: `${name.trim()}${email ? ` <${email}>` : ""} (Public)`,
        title: "Public Prayer Request",
        body: request.trim(),
        isConfidential: false,
        status: "active",
      });
      res.json({ success: true, id: prayer.id });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/public/churches/:slug/contact", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church || church.status !== "active" || church.platformStatus !== "approved") return res.status(404).json({ message: "Church not found" });
      const { name, email, subject, message } = req.body;
      if (!name?.trim() || !email?.trim() || !message?.trim()) {
        return res.status(400).json({ message: "Name, email and message are required" });
      }
      await storage.createChurchPrayerRequest({
        churchId: church.id,
        firebaseUid: `contact_${Date.now()}`,
        displayName: `${name.trim()} <${email.trim()}> (Contact)`,
        title: subject?.trim() || "Website Contact Message",
        body: message.trim(),
        isConfidential: false,
        status: "active",
      });
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/slug/:slug/my-role", async (req, res) => {
    const uid = await getUid(req); // intentionally permissive — returns null role for unauthenticated
    if (!uid) return res.json({ role: null });
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const member = await storage.getChurchMember(church.id, uid);
      res.json({ role: member?.role ?? null, memberId: member?.id ?? null, status: member?.status ?? null });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.patch("/api/churches/:id", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const church = await storage.getChurch(id);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const {
        name, description, denomination, address, websiteUrl, logoUrl,
        // Website settings fields
        pastorName, phone, email, welcomeMessage, missionStatement, vision,
        visitorInfo, mapEmbedUrl, websiteHeroImage, publicWebsiteEnabled,
        socialLinks, serviceTimes, publicPhotos,
      } = req.body;
      const update: Record<string, any> = {};
      const oldName = church.name;
      const nameChanged = name !== undefined && name !== oldName;
      // Church name changes are owner-only for security
      if (nameChanged && m.role !== "owner") return res.status(403).json({ message: "Only the church owner can change the church name" });
      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Church name cannot be empty" });
        update.name = name.trim();
      }
      if (description !== undefined) update.description = description;
      if (denomination !== undefined) update.denomination = denomination;
      if (address !== undefined) update.address = address;
      if (websiteUrl !== undefined) update.websiteUrl = websiteUrl;
      if (logoUrl !== undefined) update.logoUrl = logoUrl;
      if (pastorName !== undefined) update.pastorName = pastorName;
      if (phone !== undefined) update.phone = phone;
      if (email !== undefined) update.email = email;
      if (welcomeMessage !== undefined) update.welcomeMessage = welcomeMessage;
      if (missionStatement !== undefined) update.missionStatement = missionStatement;
      if (vision !== undefined) update.vision = vision;
      if (visitorInfo !== undefined) update.visitorInfo = visitorInfo;
      if (mapEmbedUrl !== undefined) update.mapEmbedUrl = mapEmbedUrl;
      if (websiteHeroImage !== undefined) update.websiteHeroImage = websiteHeroImage;
      if (publicWebsiteEnabled !== undefined) update.publicWebsiteEnabled = publicWebsiteEnabled;
      if (socialLinks !== undefined) update.socialLinks = socialLinks;
      if (serviceTimes !== undefined) update.serviceTimes = serviceTimes;
      if (publicPhotos !== undefined) update.publicPhotos = publicPhotos;
      const updated = await storage.updateChurch(id, update);
      // If name changed: audit log + announcement + security email
      if (nameChanged && name) {
        const newName = name as string;
        storage.createAuditLog({ churchId: id, action: "church_name_changed", previousValue: oldName, newValue: newName, actorUid: uid, actorRole: m.role }).catch(() => {});
        storage.createChurchAnnouncement({
          churchId: id,
          createdBy: uid,
          title: `Church Name Updated`,
          body: `This church has been renamed from "${oldName}" to "${newName}" on ${new Date().toLocaleDateString()} by the church owner. If you have questions, please contact your church leader.`,
          isPinned: false,
          expiresAt: null,
          imageUrl: null,
          pdfUrl: null,
          externalLink: null,
        }).catch(() => {});
        // Send security email to owner
        const ownerMember = (await storage.getChurchMembers(id)).find(mb => mb.role === "owner");
        if (ownerMember?.email) {
          sendChurchNameChangeSecurityEmail(ownerMember.email, ownerMember.displayName ?? ownerMember.email, oldName, newName, church.slug).catch(() => {});
        }
      }
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to update church" }); }
  });
app.get("/api/churches/:id/members", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member of this church" });
      const LEADER_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor", "ministry_leader", "group_leader", "prayer_team"];
      const isLeader = LEADER_ROLES.includes(m.role);
      const members = await storage.getChurchMembers(id);
      const profiles = await storage.getChurchMemberProfilesByChurchId(id);
      const photoMap = new Map(profiles.map(p => [p.firebaseUid, p.photoUrl ?? null]));
      // Server-side privacy: strip email from non-leaders; attach photoUrl for avatars
      const safe = members.map(mb => {
        const photoUrl = photoMap.get(mb.firebaseUid ?? "") ?? null;
        if (isLeader) return { ...mb, photoUrl };
        const { email: _omit, ...rest } = mb as any;
        return { ...rest, email: undefined, photoUrl };
      });
      res.json(safe);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.patch("/api/churches/:id/members/:memberId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const memberId = Number(req.params.memberId);
      const requester = await storage.getChurchMember(id, uid);
      if (!requester || !["owner", "administrator"].includes(requester.role)) return res.status(403).json({ message: "Not authorized" });
      const { role, status } = req.body;
      // Only owners can assign the owner role
      if (role === "owner" && requester.role !== "owner") return res.status(403).json({ message: "Only owners can assign the owner role" });
      let updated;
      if (role !== undefined) updated = await storage.updateChurchMemberRole(memberId, role);
      if (status !== undefined) updated = await storage.updateChurchMemberStatus(memberId, status);
      if (!updated) return res.status(400).json({ message: "Nothing to update" });
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to update member" }); }
  });
app.delete("/api/churches/:id/members/:memberId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const memberId = Number(req.params.memberId);
      const requester = await storage.getChurchMember(id, uid);
      if (!requester) return res.status(403).json({ message: "Not a member" });
      const all = await storage.getChurchMembers(id);
      const target = all.find(m => m.id === memberId);
      if (!target) return res.status(404).json({ message: "Member not found" });
      if (target.firebaseUid !== uid && !["owner", "administrator"].includes(requester.role)) return res.status(403).json({ message: "Not authorized" });
      if (target.role === "owner" && all.filter(m => m.role === "owner").length <= 1) return res.status(400).json({ message: "Cannot remove the only owner" });
      await storage.removeChurchMember(id, target.firebaseUid);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to remove member" }); }
  });
app.get("/api/churches/:id/my-profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const profile = await storage.getChurchMemberProfile(id, uid);
      res.json({ member: m, profile: profile ?? null });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.put("/api/churches/:id/my-profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const { fullName, phone, country, city, bio, photoUrl, showInDirectory, allowMemberMessages, allowLeaderContact, showPhoneToLeadersOnly } = req.body;
      const profile = await storage.upsertChurchMemberProfile({
        churchId: id, firebaseUid: uid,
        fullName: fullName ?? null, phone: phone ?? null,
        country: country ?? null, city: city ?? null,
        bio: bio ?? null, photoUrl: photoUrl ?? null,
        showInDirectory: showInDirectory ?? true,
        allowMemberMessages: allowMemberMessages ?? true,
        allowLeaderContact: allowLeaderContact ?? true,
        showPhoneToLeadersOnly: showPhoneToLeadersOnly ?? true,
      });
      res.json(profile);
    } catch { res.status(500).json({ message: "Failed to update profile" }); }
  });
app.patch("/api/churches/:id/my-profile/photo", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const { objectPath } = req.body;
      if (!objectPath || typeof objectPath !== "string") return res.status(400).json({ message: "objectPath is required" });
      if (!objectPath.startsWith("/objects/")) return res.status(400).json({ message: "Invalid object path" });
      const profile = await storage.upsertChurchMemberProfile({ churchId: id, firebaseUid: uid, photoUrl: objectPath });
      res.json({ photoUrl: profile.photoUrl });
    } catch { res.status(500).json({ message: "Failed to update photo" }); }
  });
app.delete("/api/churches/:id/my-profile/photo", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      await storage.upsertChurchMemberProfile({ churchId: id, firebaseUid: uid, photoUrl: null });
      res.json({ photoUrl: null });
    } catch { res.status(500).json({ message: "Failed to remove photo" }); }
  });
app.get("/api/churches/:id/members/:memberId/public-profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const memberId = Number(req.params.memberId);
      // Verify viewer is active member
      const viewer = await storage.getChurchMember(churchId, uid);
      if (!viewer || viewer.status !== "active") return res.status(403).json({ message: "Not an active member" });
      // Fetch target member
      const target = await storage.getChurchMemberById(churchId, memberId);
      if (!target || target.status !== "active") return res.status(404).json({ message: "Member not found" });
      // Fetch target's profile
      const profile = await storage.getChurchMemberProfile(churchId, target.firebaseUid);
      // Fetch departments for this member
      const deptRows = await db.execute(sql`
        SELECT cd.name FROM church_department_members cdm
        INNER JOIN church_departments cd ON cd.id = cdm.department_id
        WHERE cdm.church_member_id = ${memberId} AND cdm.is_active = true AND cd.is_active = true
      `);
      const departments = (deptRows.rows as { name: string }[]).map(r => r.name);
      const isOwnProfile = target.firebaseUid === uid;
      const LEADER_ROLES_SET = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor", "ministry_leader", "group_leader", "prayer_team"];
      const viewerIsLeader = LEADER_ROLES_SET.includes(viewer.role);
      res.json({
        member: {
          id: target.id,
          displayName: target.displayName,
          role: target.role,
          joinedAt: target.joinedAt,
          firebaseUid: isOwnProfile || viewerIsLeader ? target.firebaseUid : undefined,
        },
        profile: profile ? {
          bio: profile.bio,
          city: profile.city,
          country: profile.country,
          photoUrl: profile.photoUrl,
          allowMemberMessages: profile.allowMemberMessages,
        } : null,
        allowMessages: profile?.allowMemberMessages ?? true,
        isOwnProfile,
        departments,
      });
    } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/invitations", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      // Platform governance gate: only approved orgs can create new invitations
      const church = await storage.getChurch(id);
      if (!church || church.platformStatus !== "approved") return res.status(403).json({ message: "Invitations can only be created for approved organizations" });
      const { label, expiresAt, maxUses, invitationType, targetGroupId } = req.body;
      let groupName: string | null = null;
      if (targetGroupId) {
        const groups = await storage.getChurchGroups(id);
        groupName = groups.find(g => g.id === Number(targetGroupId))?.name ?? null;
      }
      let code = inviteCode();
      for (let i = 0; i < 10 && await storage.getChurchInvitation(code); i++) code = inviteCode();
      const inv = await storage.createChurchInvitation({
        churchId: id, inviteCode: code, createdBy: uid,
        label: label || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses ? Number(maxUses) : null,
        isActive: true,
        invitationType: invitationType || "membership",
        targetGroupId: targetGroupId ? Number(targetGroupId) : null,
        targetGroupName: groupName,
      });
      storage.createAuditLog({ churchId: id, action: "invitation_created", newValue: code, actorUid: uid, actorRole: m.role }).catch(() => {});
      res.status(201).json(inv);
    } catch { res.status(500).json({ message: "Failed to create invitation" }); }
  });
app.get("/api/churches/:id/invitations", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      res.json(await storage.getChurchInvitations(id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.delete("/api/churches/:id/invitations/:invId", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const invId = Number(req.params.invId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "administrator", "lead_pastor", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { permanent } = req.query;
      if (permanent === "true") await storage.deleteChurchInvitation(invId);
      else await storage.deactivateChurchInvitation(invId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to deactivate invitation" }); }
  });
app.patch("/api/churches/:id/settings", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { approvalMode, memberDirectoryEnabled } = req.body;
      const update: any = {};
      if (approvalMode !== undefined) update.approvalMode = approvalMode;
      if (memberDirectoryEnabled !== undefined) update.memberDirectoryEnabled = memberDirectoryEnabled;
      res.json(await storage.updateChurch(id, update));
    } catch { res.status(500).json({ message: "Failed to update settings" }); }
  });
app.get("/api/churches/:id/profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m) return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getChurchMemberProfile(churchId, uid) ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m) return res.status(403).json({ message: "Not a member" });
      const { fullName, phone, country, city, address, bio, photoUrl, showInDirectory, allowMemberMessages, allowLeaderContact, showPhoneToLeadersOnly } = req.body;
      res.json(await storage.upsertChurchMemberProfile({ churchId, firebaseUid: uid, fullName, phone, country, city, address, bio, photoUrl, showInDirectory, allowMemberMessages, allowLeaderContact, showPhoneToLeadersOnly }));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/members/:targetUid/profile", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      res.json(await storage.getChurchMemberProfile(churchId, req.params.targetUid) ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/directory", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const church = await storage.getChurch(churchId);
      if (!church?.memberDirectoryEnabled) return res.status(403).json({ message: "Directory is not enabled for this church" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const members = await storage.getChurchMembers(churchId);
      const activeMembers = members.filter(mb => mb.status === "active");
      // Return public-safe directory entries
      const directory = await Promise.all(activeMembers.map(async mb => {
        const profile = await storage.getChurchMemberProfile(churchId, mb.firebaseUid);
        if (profile && !profile.showInDirectory) return null;
        const entry: any = { firebaseUid: mb.firebaseUid, displayName: mb.displayName, role: mb.role, bio: profile?.bio ?? null, photoUrl: profile?.photoUrl ?? null };
        if (isLeader) {
          entry.email = mb.email;
          entry.phone = profile?.showPhoneToLeadersOnly ? profile.phone : null;
          entry.city = profile?.city ?? null;
          entry.country = profile?.country ?? null;
        }
        return entry;
      }));
      res.json(directory.filter(Boolean));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/conversations", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const convs = await storage.getChurchConversations(churchId, uid, isLeader);
      const unread = await storage.getUnreadMessageCount(churchId, uid);
      res.json({ conversations: convs, unreadCount: unread });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/conversations", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const { subject, category, targetType, targetGroupId, initialMessage } = req.body;
      if (!subject?.trim()) return res.status(400).json({ message: "Subject is required" });
      if (!initialMessage?.trim()) return res.status(400).json({ message: "Message is required" });
      // Only leaders can send to groups or all members
      if ((targetType === "all" || targetType === "leaders" || targetType === "group") && !isLeader) return res.status(403).json({ message: "Not authorized to broadcast messages" });
      const conv = await storage.createChurchConversation({
        churchId, subject: subject.trim(), category: category || "general",
        status: "open", createdBy: uid,
        targetType: targetType || "direct",
        targetGroupId: targetGroupId ? Number(targetGroupId) : null,
      });
      // Add creator as participant
      await storage.addConversationParticipant({ conversationId: conv.id, churchId, firebaseUid: uid, displayName: m.displayName, role: isLeader ? "pastor" : "member", addedBy: uid });
      // For direct messages: add a pastor/admin as participant
      if (targetType === "direct" && !isLeader) {
        const allMembers = await storage.getChurchMembers(churchId);
        const leader = allMembers.find(mb => mb.status === "active" && ["owner", "lead_pastor"].includes(mb.role));
        if (leader) await storage.addConversationParticipant({ conversationId: conv.id, churchId, firebaseUid: leader.firebaseUid, displayName: leader.displayName, role: "pastor", addedBy: uid });
      }
      // Create first message
      const msg = await storage.createChurchMessage({ conversationId: conv.id, churchId, senderUid: uid, senderName: m.displayName, senderRole: isLeader ? "pastor" : "member", body: initialMessage.trim(), isSystemMessage: false });
      res.status(201).json({ conversation: conv, message: msg });
    } catch { res.status(500).json({ message: "Failed to create conversation" }); }
  });
app.get("/api/churches/:id/conversations/:convId", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const convId = Number(req.params.convId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const conv = await storage.getChurchConversation(convId);
      if (!conv || conv.churchId !== churchId) return res.status(404).json({ message: "Conversation not found" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const isParticipant = await storage.isConversationParticipant(convId, uid);
      if (!isLeader && !isParticipant) return res.status(403).json({ message: "Not a participant in this conversation" });
      const [messages, participants] = await Promise.all([
        storage.getChurchMessages(convId),
        storage.getConversationParticipants(convId),
      ]);
      await storage.markMessagesRead(convId, uid);
      res.json({ conversation: conv, messages, participants });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/conversations/:convId/messages", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const convId = Number(req.params.convId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not an active member" });
      const conv = await storage.getChurchConversation(convId);
      if (!conv || conv.churchId !== churchId) return res.status(404).json({ message: "Conversation not found" });
      const isLeader = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role);
      const isParticipant = await storage.isConversationParticipant(convId, uid);
      if (!isLeader && !isParticipant) return res.status(403).json({ message: "Not authorized to reply" });
      if (conv.status === "closed") return res.status(400).json({ message: "Conversation is closed" });
      const { body } = req.body;
      if (!body?.trim()) return res.status(400).json({ message: "Message body is required" });
      const msg = await storage.createChurchMessage({ conversationId: convId, churchId, senderUid: uid, senderName: m.displayName, senderRole: isLeader ? "pastor" : "member", body: body.trim(), isSystemMessage: false });
      res.status(201).json(msg);
    } catch { res.status(500).json({ message: "Failed to send message" }); }
  });
app.patch("/api/churches/:id/conversations/:convId", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const convId = Number(req.params.convId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "counselor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const conv = await storage.getChurchConversation(convId);
      if (!conv || conv.churchId !== churchId) return res.status(404).json({ message: "Not found" });
      const { status, assignedTo, isUrgent } = req.body;
      const updated = await storage.updateChurchConversation(convId, { status, assignedTo, isUrgent });
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to update conversation" }); }
  });
app.post("/api/churches/:id/conversations/:convId/participants", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const convId = Number(req.params.convId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const conv = await storage.getChurchConversation(convId);
      if (!conv || conv.churchId !== churchId) return res.status(404).json({ message: "Not found" });
      const { firebaseUid: targetUid, displayName, role: participantRole } = req.body;
      if (!targetUid) return res.status(400).json({ message: "Firebase UID is required" });
      // Verify they are a member
      const targetMember = await storage.getChurchMember(churchId, targetUid);
      if (!targetMember) return res.status(404).json({ message: "User is not a member of this church" });
      const participant = await storage.addConversationParticipant({ conversationId: convId, churchId, firebaseUid: targetUid, displayName: displayName || targetMember.displayName, role: participantRole || "assistant", addedBy: uid });
      // Create system message noting the addition
      await storage.createChurchMessage({ conversationId: convId, churchId, senderUid: uid, senderName: m.displayName, senderRole: "admin", body: `${displayName || targetMember.displayName || "A staff member"} was added to this conversation.`, isSystemMessage: true });
      res.status(201).json(participant);
    } catch { res.status(500).json({ message: "Failed to add participant" }); }
  });
app.get("/api/churches/:id/unread-count", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m) return res.json({ count: 0 });
      res.json({ count: await storage.getUnreadMessageCount(churchId, uid) });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/sermons", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getChurchSermons(id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/sermons", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, description, speakerName, videoUrl, audioUrl, pdfNotesUrl, outlineUrl, imageUrl, bibleReference, sermonDate, scheduledDate, isPublished } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title required" });
      res.status(201).json(await storage.createChurchSermon({
        churchId: id, title: title.trim(), description: description?.trim() || null,
        speakerName: speakerName?.trim() || null, videoUrl: videoUrl?.trim() || null,
        audioUrl: audioUrl?.trim() || null, pdfNotesUrl: pdfNotesUrl?.trim() || null,
        outlineUrl: outlineUrl?.trim() || null, imageUrl: imageUrl?.trim() || null,
        bibleReference: bibleReference?.trim() || null,
        sermonDate: sermonDate ? new Date(sermonDate) : null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        isPublished: isPublished !== false, createdBy: uid,
      }));
    } catch { res.status(500).json({ message: "Failed to create sermon" }); }
  });
app.patch("/api/churches/:id/sermons/:sermonId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, description, speakerName, videoUrl, audioUrl, pdfNotesUrl, outlineUrl, imageUrl, bibleReference, sermonDate, scheduledDate, isPublished } = req.body;
      res.json(await storage.updateChurchSermon(sermonId, {
        title, description, speakerName, videoUrl, audioUrl, pdfNotesUrl, outlineUrl, imageUrl,
        bibleReference, isPublished,
        sermonDate: sermonDate !== undefined ? (sermonDate ? new Date(sermonDate) : null) : undefined,
        scheduledDate: scheduledDate !== undefined ? (scheduledDate ? new Date(scheduledDate) : null) : undefined,
      }));
    } catch { res.status(500).json({ message: "Failed to update sermon" }); }
  });
app.delete("/api/churches/:id/sermons/:sermonId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteChurchSermon(sermonId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete sermon" }); }
  });
const PASTOR_DASH_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
app.get("/api/churches/:id/dashboard", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !PASTOR_DASH_ROLES.includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      res.json(await storage.getChurchDashboardStats(id));
    } catch (e) { console.error("Dashboard error:", e); res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/pastor-notes", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const isAdmin = PASTOR_DASH_ROLES.includes(m.role);
      res.json(await storage.listChurchPastorNotes(id, isAdmin));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/pastor-notes", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !PASTOR_DASH_ROLES.includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, sermonDate, scripture, summary, keyPoints, closingPrayer } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title required" });
      const note = await storage.createChurchPastorNote({
        churchId: id,
        title: title.trim(),
        sermonDate: sermonDate ? new Date(sermonDate) : null,
        scripture: scripture?.trim() || null,
        summary: summary?.trim() || null,
        keyPoints: Array.isArray(keyPoints) ? keyPoints.filter((k: string) => k?.trim()) : null,
        closingPrayer: closingPrayer?.trim() || null,
        status: "draft",
        authorUid: uid,
        authorName: m.displayName ?? null,
      });
      res.status(201).json(note);
    } catch (e) { console.error("Create pastor note error:", e); res.status(500).json({ message: "Failed to create note" }); }
  });
app.patch("/api/churches/:id/pastor-notes/:noteId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const noteId = Number(req.params.noteId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !PASTOR_DASH_ROLES.includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, sermonDate, scripture, summary, keyPoints, closingPrayer, status } = req.body;
      const updateData: Record<string, any> = {};
      if (title !== undefined) updateData.title = title?.trim() || null;
      if (sermonDate !== undefined) updateData.sermonDate = sermonDate ? new Date(sermonDate) : null;
      if (scripture !== undefined) updateData.scripture = scripture?.trim() || null;
      if (summary !== undefined) updateData.summary = summary?.trim() || null;
      if (keyPoints !== undefined) updateData.keyPoints = Array.isArray(keyPoints) ? keyPoints.filter((k: string) => k?.trim()) : null;
      if (closingPrayer !== undefined) updateData.closingPrayer = closingPrayer?.trim() || null;
      if (status !== undefined) {
        updateData.status = status;
        if (status === "published") updateData.publishedAt = new Date();
      }
      const note = await storage.updateChurchPastorNote(noteId, id, updateData);
      // When published: create a church announcement as in-app notification
      if (status === "published" && note) {
        try {
          await storage.createChurchAnnouncement({
            churchId: id,
            title: `📖 New sermon notes: ${note.title}`,
            body: note.scripture ? `Scripture: ${note.scripture}` : "New sermon notes are now available.",
            isPinned: false,
            createdBy: uid,
          });
        } catch { /* non-fatal: note was saved, just skip announcement */ }
      }
      res.json(note);
    } catch (e) { console.error("Update pastor note error:", e); res.status(500).json({ message: "Failed to update note" }); }
  });
app.get("/api/churches/:id/announcements", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getChurchAnnouncements(id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/announcements", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, body, isPinned, expiresAt, imageUrl, pdfUrl, externalLink } = req.body;
      if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: "Title and body required" });
      res.status(201).json(await storage.createChurchAnnouncement({
        churchId: id, title: title.trim(), body: body.trim(),
        isPinned: !!isPinned, expiresAt: expiresAt ? new Date(expiresAt) : null,
        imageUrl: imageUrl?.trim() || null, pdfUrl: pdfUrl?.trim() || null,
        externalLink: externalLink?.trim() || null, createdBy: uid,
      }));
    } catch { res.status(500).json({ message: "Failed to create announcement" }); }
  });
app.patch("/api/churches/:id/announcements/:annId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const annId = Number(req.params.annId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { title, body, isPinned, expiresAt, imageUrl, pdfUrl, externalLink } = req.body;
      res.json(await storage.updateChurchAnnouncement(annId, {
        title, body, isPinned,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
        imageUrl: imageUrl !== undefined ? (imageUrl?.trim() || null) : undefined,
        pdfUrl: pdfUrl !== undefined ? (pdfUrl?.trim() || null) : undefined,
        externalLink: externalLink !== undefined ? (externalLink?.trim() || null) : undefined,
      }));
    } catch { res.status(500).json({ message: "Failed to update announcement" }); }
  });
app.delete("/api/churches/:id/announcements/:annId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const annId = Number(req.params.annId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteChurchAnnouncement(annId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete announcement" }); }
  });
app.get("/api/churches/:id/groups", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const groups = await storage.getChurchGroups(id);
      const enriched = await Promise.all(groups.map(async (g) => {
        const members = await storage.getChurchGroupMembers(g.id);
        const myMembership = members.find(gm => gm.firebaseUid === uid);
        return { ...g, memberCount: members.length, isMember: !!myMembership };
      }));
      res.json(enriched);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/groups", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { name, description, category, leaderName, meetingSchedule, isPublic } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Group name required" });
      res.status(201).json(await storage.createChurchGroup({
        churchId: id, name: name.trim(), description: description?.trim() || null,
        category: category?.trim() || null, leaderId: uid, leaderName: leaderName?.trim() || m.displayName || null,
        meetingSchedule: meetingSchedule?.trim() || null, isPublic: isPublic !== false,
      }));
    } catch { res.status(500).json({ message: "Failed to create group" }); }
  });
app.patch("/api/churches/:id/groups/:groupId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const groupId = Number(req.params.groupId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { name, description, category, leaderName, meetingSchedule, isPublic } = req.body;
      res.json(await storage.updateChurchGroup(groupId, { name, description, category, leaderName, meetingSchedule, isPublic }));
    } catch { res.status(500).json({ message: "Failed to update group" }); }
  });
app.delete("/api/churches/:id/groups/:groupId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const groupId = Number(req.params.groupId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteChurchGroup(groupId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete group" }); }
  });
app.post("/api/churches/:id/groups/:groupId/join", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const groupId = Number(req.params.groupId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const result = await storage.addChurchGroupMember({ groupId, firebaseUid: uid, displayName: m.displayName || null, email: m.email });
      res.json(result);
    } catch { res.status(500).json({ message: "Failed to join group" }); }
  });
app.delete("/api/churches/:id/groups/:groupId/leave", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const groupId = Number(req.params.groupId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member of this church" });
      await storage.removeChurchGroupMember(groupId, uid);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to leave group" }); }
  });
app.get("/api/churches/:id/prayer", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const canSeeConfidential = ["owner", "lead_pastor", "administrator", "associate_pastor", "counselor", "prayer_team"].includes(m.role);
      res.json(await storage.getChurchPrayerRequests(id, canSeeConfidential));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/prayer", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const { title, body, isConfidential } = req.body;
      if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: "Title and body required" });
      const req2 = await storage.createChurchPrayerRequest({
        churchId: id, firebaseUid: uid, displayName: m.displayName || null,
        title: title.trim(), body: body.trim(), isConfidential: !!isConfidential, status: "active",
      });
      await storage.logChurchActivity({ churchId: id, firebaseUid: uid, displayName: m.displayName || null, activityType: "prayer_submitted", metadata: null });
      res.status(201).json(req2);
    } catch { res.status(500).json({ message: "Failed to submit prayer request" }); }
  });
app.post("/api/churches/:id/prayer/:prayerId/pray", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const prayerId = Number(req.params.prayerId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      // Validate prayer request belongs to this church
      const prayerReqs = await storage.getChurchPrayerRequests(id, true);
      if (!prayerReqs.find(pr => pr.id === prayerId)) return res.status(404).json({ message: "Prayer request not found" });
      res.json(await storage.incrementPrayerCount(prayerId));
    } catch { res.status(500).json({ message: "Failed to register prayer" }); }
  });
app.patch("/api/churches/:id/prayer/:prayerId/status", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const prayerId = Number(req.params.prayerId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor", "prayer_team"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      // Validate prayer request belongs to this church
      const prayerReqs = await storage.getChurchPrayerRequests(id, true);
      if (!prayerReqs.find(pr => pr.id === prayerId)) return res.status(404).json({ message: "Prayer request not found" });
      const { status } = req.body;
      res.json(await storage.updateChurchPrayerStatus(prayerId, status));
    } catch { res.status(500).json({ message: "Failed to update prayer status" }); }
  });
app.delete("/api/churches/:id/prayer/:prayerId", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const prayerId = Number(req.params.prayerId);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      // Validate prayer request belongs to this church
      const prayerReqs = await storage.getChurchPrayerRequests(id, true);
      if (!prayerReqs.find(pr => pr.id === prayerId)) return res.status(404).json({ message: "Prayer request not found" });
      await storage.deleteChurchPrayerRequest(prayerId);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete prayer request" }); }
  });
app.get("/api/churches/:id/activity", async (req, res) => {
    const uid = await getUid(req, res);
    if (!uid) return;
    try {
      const id = Number(req.params.id);
      const m = await storage.getChurchMember(id, uid);
      if (!m || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      res.json(await storage.getChurchActivity(id, 100));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/members/pending-count", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const count = await storage.getPendingMembersCount(churchId);
      res.json({ count });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/departments/:deptId/archive", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const dept = await storage.getDepartment(deptId);
      if (!dept) return res.status(404).json({ message: "Department not found" });
      const m = await storage.getChurchMember(dept.churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const deptMembers = await storage.getDepartmentMembers(deptId);
      const updated = await storage.archiveDepartment(deptId);
      storage.createAuditLog({ churchId: dept.churchId, departmentId: deptId, action: "department_archived", previousValue: dept.name, actorUid: uid, actorRole: m.role }).catch(() => {});
      // Targeted in-app notification: create an inbox thread for each active department member
      const closureDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      for (const dm of deptMembers) {
        const memberEmail = dm.member?.email;
        const memberName = dm.member?.displayName ?? dm.member?.email ?? "Member";
        if (memberEmail) {
          storage.createInboxThread(
            { userEmail: memberEmail, userName: memberName, subject: `Department Archived: ${dept.name}`, category: "General" },
            `Dear ${memberName},\n\nThe "${dept.name}" department of your church has been archived effective ${closureDate}. As a member of this department, your access to department activities will no longer be available.\n\nPlease reach out to church leadership if you have any questions.\n\nGod bless,\nChurch Leadership`
          ).catch(() => {});
        }
      }
      res.json(updated);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/deletion-request", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const church = await storage.getChurch(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.role !== "owner") return res.status(403).json({ message: "Only the church owner can request deletion" });
      const schema = z.object({
        reason: z.string().min(1),
        explanation: z.string().optional(),
        ownerEmail: z.string().email(),
        ownerName: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
      const existing = await storage.getMyDeletionRequest(churchId, uid);
      if (existing && existing.status === "pending") return res.status(409).json({ message: "You already have a pending deletion request" });
      const request = await storage.createDeletionRequest({
        churchId,
        ownerUid: uid,
        ownerEmail: parsed.data.ownerEmail,
        ownerName: parsed.data.ownerName,
        reason: parsed.data.reason,
        explanation: parsed.data.explanation,
      });
      storage.createAuditLog({ churchId, action: "deletion_requested", actorUid: uid, actorRole: m.role, newValue: parsed.data.reason }).catch(() => {});
      res.json(request);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/deletion-request", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.role !== "owner") return res.status(403).json({ message: "Not authorized" });
      const request = await storage.getMyDeletionRequest(churchId, uid);
      res.json(request ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/audit-logs", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "administrator", "lead_pastor"].includes(m.role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const limit = Math.min(Number(req.query.limit ?? 100), 200);
      const logs = await storage.getChurchAuditLogs(churchId, limit);
      res.json(logs);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/admin/church-deletion-requests", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const { status } = req.query;
      const requests = await storage.getDeletionRequests(typeof status === "string" ? status : undefined);
      res.json(requests);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.patch("/api/admin/church-deletion-requests/:id", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const id = Number(req.params.id);
      const schema = z.object({ status: z.enum(["approved", "rejected", "info_requested"]), adminNote: z.string().optional().nullable() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
      const updated = await storage.updateDeletionRequestStatus(id, parsed.data.status, "admin", parsed.data.adminNote ?? undefined);
      storage.createAuditLog({ churchId: updated.churchId, action: `deletion_request_${parsed.data.status}`, newValue: parsed.data.adminNote ?? undefined, actorUid: "platform_admin" }).catch(() => {});
      res.json(updated);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/admin/churches", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const churches = await storage.getAllChurches();
      const enriched = await Promise.all(churches.map(async (c) => {
        const members = await storage.getChurchMembers(c.id);
        return { ...c, memberCount: members.length };
      }));
      res.json(enriched);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.patch("/api/admin/churches/:id/status", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      if (!["active", "inactive", "suspended"].includes(status)) return res.status(400).json({ message: "Invalid status" });
      res.json(await storage.updateChurchStatus(id, status));
    } catch { res.status(500).json({ message: "Failed to update church status" }); }
  });
app.post("/api/churches/:id/submit-for-review", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const church = await storage.getChurch(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      if (church.platformStatus !== "draft") return res.status(400).json({ message: `Cannot submit for review from status: ${church.platformStatus}` });
      const updated = await storage.updateChurchPlatformStatus(churchId, "submitted", undefined, uid);
      // Persist submission timestamp
      await storage.updateChurch(churchId, { submittedForReviewAt: new Date() } as any);
      storage.createAuditLog({ churchId, action: "submitted_for_review", actorUid: uid }).catch(() => {});
      res.json({ ...updated, submittedForReviewAt: new Date() });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:churchId/compliance-cases/:caseId/respond", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const caseId = Number(req.params.caseId);
      const churchId = Number(req.params.churchId);
      // Verify membership — platform governance channels are owner-only
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      // IDOR guard: verify case actually belongs to this church
      const complianceCase = await storage.getComplianceCase(caseId);
      if (!complianceCase || complianceCase.churchId !== churchId) return res.status(404).json({ message: "Case not found" });
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
      const resp = await storage.createComplianceCaseResponse({ caseId, senderType: "owner", senderUid: uid, message: message.trim(), attachmentUrl: req.body.attachmentUrl ?? null });
      await storage.updateComplianceCase(caseId, { status: "investigating" });
      storage.createAuditLog({ churchId, action: "case_response_submitted", newValue: `caseId:${caseId}`, actorUid: uid }).catch(() => {});
      res.status(201).json(resp);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:churchId/compliance-cases", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const cases = await storage.getComplianceCases(churchId);
      const enriched = await Promise.all(cases.map(async (c) => ({
        ...c, responses: await storage.getComplianceCaseResponses(c.id),
      })));
      res.json(enriched);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:churchId/appeal", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      // Appeals are only accepted for rejected or suspended organisations
      const church = await storage.getChurch(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      if (!["rejected", "suspended"].includes(church.platformStatus ?? "")) {
        return res.status(400).json({ message: "Appeals may only be submitted for rejected or suspended organisations." });
      }
      const { message, caseId } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
      const appeal = await storage.createComplianceAppeal({ churchId, ownerUid: uid, message: message.trim(), caseId: caseId ?? null, status: "pending" });
      storage.createAuditLog({ churchId, action: "appeal_submitted", actorUid: uid }).catch(() => {});
      res.status(201).json(appeal);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:churchId/appeal", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      res.json(await storage.getComplianceAppeals(churchId));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:churchId/policy-ack", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || !["owner", "lead_pastor", "administrator"].includes(member.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { policyVersion } = req.body;
      storage.createAuditLog({
        churchId,
        action: "policy_acknowledged",
        newValue: JSON.stringify({ policyVersion: policyVersion ?? "church-mode-v1", acknowledgedAt: new Date().toISOString() }),
        actorUid: uid,
        actorRole: member.role,
      }).catch(() => {});
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:churchId/platform-thread", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      // Scoped to this owner's UID — cannot see other members' threads
      res.json(await storage.getOwnerPlatformAdminThread(churchId, uid) ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:churchId/platform-thread/start", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const { subject, message } = req.body;
      if (!subject?.trim() || !message?.trim()) return res.status(400).json({ message: "Subject and message required" });
      // Get or create THIS owner's thread — never touches another user's thread
      let thread = await storage.getOwnerPlatformAdminThread(churchId, uid);
      if (!thread) {
        thread = await storage.createPlatformAdminThread({ churchId, ownerUid: uid, subject: subject.trim(), status: "open", hasUnreadAdmin: true, hasUnreadOwner: false });
      }
      const msg = await storage.createPlatformAdminMessage({ threadId: thread.id, senderType: "owner", senderUid: uid, message: message.trim() });
      await storage.updatePlatformAdminThread(thread.id, { hasUnreadAdmin: true, hasUnreadOwner: false });
      res.status(201).json({ thread, msg });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:churchId/platform-thread/messages", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const thread = await storage.getOwnerPlatformAdminThread(churchId, uid);
      if (!thread) return res.json([]);
      await storage.updatePlatformAdminThread(thread.id, { hasUnreadOwner: false });
      res.json(await storage.getPlatformAdminMessages(thread.id));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:churchId/platform-thread/mark-read", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const thread = await storage.getOwnerPlatformAdminThread(churchId, uid);
      if (thread) await storage.updatePlatformAdminThread(thread.id, { hasUnreadOwner: false });
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:churchId/platform-thread/reply", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.churchId);
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.role !== "owner") return res.status(403).json({ message: "Forbidden" });
      const thread = await storage.getOwnerPlatformAdminThread(churchId, uid);
      if (!thread) return res.status(404).json({ message: "No thread found" });
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message required" });
      const msg = await storage.createPlatformAdminMessage({ threadId: thread.id, senderType: "owner", senderUid: uid, message: message.trim() });
      await storage.updatePlatformAdminThread(thread.id, { hasUnreadAdmin: true, hasUnreadOwner: false });
      res.status(201).json(msg);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/logo", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const church = await storage.getChurch(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const { logoUrl } = req.body;
      if (!logoUrl || typeof logoUrl !== "string") return res.status(400).json({ message: "logoUrl is required" });
      res.json(await storage.updateChurchLogoUrl(churchId, logoUrl));
    } catch { res.status(500).json({ message: "Failed to update logo" }); }
  });
app.patch("/api/churches/:id/branding", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || !["owner", "lead_pastor", "administrator"].includes(m.role)) return res.status(403).json({ message: "Not authorized" });
      const { logoUrl, bannerUrl, themeColor } = req.body;
      const update: Record<string, string | null> = {};
      if (logoUrl !== undefined) update.logoUrl = logoUrl?.trim() || null;
      if (bannerUrl !== undefined) update.bannerUrl = bannerUrl?.trim() || null;
      if (themeColor !== undefined) update.themeColor = themeColor?.trim() || null;
      res.json(await storage.updateChurchBranding(churchId, update));
    } catch { res.status(500).json({ message: "Failed to update branding" }); }
  });
app.post("/api/churches/:id/sermons/:sermonId/bookmark", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const isBookmarked = await storage.toggleSermonBookmark(sermonId, churchId, uid);
      res.json({ isBookmarked });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/bookmarks", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const sermonIds = await storage.getSermonBookmarks(churchId, uid);
      res.json({ sermonIds });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/sermons/:sermonId/note", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const note = await storage.getSermonNote(sermonId, uid);
      res.json({ body: note?.body ?? "" });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.put("/api/churches/:id/sermons/:sermonId/note", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const sermonId = Number(req.params.sermonId);
      const m = await storage.getChurchMember(churchId, uid);
      if (!m || m.status !== "active") return res.status(403).json({ message: "Not a member" });
      const { body } = req.body;
      const note = await storage.upsertSermonNote(sermonId, churchId, uid, body ?? "");
      res.json(note);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/giving/reports", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const txns = await storage.getChurchTransactions(churchId, 5000);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const completed = txns.filter(t => t.status === "completed");
      const sum = (arr: typeof completed) => ({
        gross: arr.reduce((s, t) => s + t.grossAmount, 0),
        fee: arr.reduce((s, t) => s + t.platformFeeAmount, 0),
        net: arr.reduce((s, t) => s + t.churchNetAmount, 0),
        count: arr.length,
      });
      const filterByDate = (d: Date) => completed.filter(t => t.createdAt && new Date(t.createdAt) >= d);
      res.json({
        today: sum(filterByDate(startOfDay)),
        week: sum(filterByDate(startOfWeek)),
        month: sum(filterByDate(startOfMonth)),
        year: sum(filterByDate(startOfYear)),
        all: sum(completed),
        recent: txns.slice(0, 20),
      });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/giving/export-csv", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const txns = await storage.getChurchTransactions(churchId, 5000);
      const header = "Date,Reference,Category,Donor,Email,Anonymous,Gross,Platform Fee,Net,Status";
      const fmt = (cents: number) => (cents / 100).toFixed(2);
      const escape = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
      const rows = txns.map(t => [
        t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "",
        escape(t.reference),
        escape(t.categoryName),
        escape(t.isAnonymous ? "Anonymous" : t.donorName),
        escape(t.isAnonymous ? "" : t.donorEmail),
        t.isAnonymous ? "Yes" : "No",
        fmt(t.grossAmount),
        fmt(t.platformFeeAmount),
        fmt(t.churchNetAmount),
        t.status,
      ].join(",")).join("\n");
      const csv = header + "\n" + rows;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="giving-report-${churchId}.csv"`);
      res.send(csv);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/giving/settings", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      if (!members.find(m => m.firebaseUid === uid)) return res.status(403).json({ message: "Not a member" });
      const settings = await storage.getChurchGivingSettings(churchId);
      res.json(settings ?? { churchId, isEnabled: false, currency: "USD", platformFeeAccepted: false });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/giving/settings", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const { isEnabled, currency, platformFeeAccepted, givingStatement } = req.body;
      res.json(await storage.upsertChurchGivingSettings(churchId, { isEnabled, currency, platformFeeAccepted, givingStatement }));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/slug/:slug/giving", async (req, res) => {
    try {
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const [settings, categories, platformFeeStr] = await Promise.all([
        storage.getChurchGivingSettings(church.id),
        storage.getChurchGivingCategories(church.id),
        storage.getGlobalGivingSetting("platform_fee_percent"),
      ]);
      res.json({ church, settings, categories: categories.filter(c => c.isActive), platformFeePercent: platformFeeStr ? parseFloat(platformFeeStr) : 2.5 });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/giving/categories", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      if (!members.find(m => m.firebaseUid === uid)) return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getChurchGivingCategories(churchId));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/giving/categories", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const { name, description, displayOrder } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
      res.json(await storage.createChurchGivingCategory({ churchId, name: name.trim(), description, displayOrder: displayOrder ?? 0 }));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.patch("/api/churches/:id/giving/categories/:catId", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const { name, description, isActive, displayOrder } = req.body;
      res.json(await storage.updateChurchGivingCategory(Number(req.params.catId), { name, description, isActive, displayOrder }));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.delete("/api/churches/:id/giving/categories/:catId", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteChurchGivingCategory(Number(req.params.catId));
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/payout-config", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const config = await storage.getChurchPayoutConfig(churchId);
      if (config?.accountNumber) {
        res.json({ ...config, accountNumber: config.accountNumber.replace(/.(?=.{4})/g, "•") });
      } else {
        res.json(config ?? null);
      }
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/payout-config", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      const config = await storage.upsertChurchPayoutConfig(churchId, req.body, uid);
      const masked = config.accountNumber ? config.accountNumber.replace(/.(?=.{4})/g, "•") : null;
      res.json({ ...config, accountNumber: masked });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/churches/:id/giving/transactions", async (req, res) => {
    const uid = await getUid(req, res); if (!uid) return;
    try {
      const churchId = Number(req.params.id);
      const members = await storage.getChurchMembers(churchId);
      const member = members.find(m => m.firebaseUid === uid);
      if (!member || !["owner", "lead_pastor", "administrator", "associate_pastor"].includes(member.role)) return res.status(403).json({ message: "Not authorized" });
      res.json(await storage.getChurchTransactions(churchId));
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/slug/:slug/giving/create-session", async (req, res) => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(503).json({ message: "Card payments are not currently configured." });
      const church = await storage.getChurchBySlug(req.params.slug);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const settings = await storage.getChurchGivingSettings(church.id);
      if (!settings?.isEnabled) return res.status(403).json({ message: "Online giving is not enabled for this church." });
      const { amount, categoryId, categoryName, donorName, donorEmail, isAnonymous, note, donorFirebaseUid } = req.body;
      if (!amount || isNaN(Number(amount)) || Number(amount) < 1) return res.status(400).json({ message: "Enter a valid amount (minimum $1)." });
      if (!categoryName) return res.status(400).json({ message: "Giving category is required." });
      const grossCents = Math.round(Number(amount) * 100);
      const platformFeeStr = await storage.getGlobalGivingSetting("platform_fee_percent");
      const platformFeePercent = platformFeeStr ? parseFloat(platformFeeStr) : 2.5;
      const platformFeeCents = Math.round(grossCents * (platformFeePercent / 100));
      const providerFeeCents = Math.round(grossCents * 0.029 + 30);
      const churchNetCents = grossCents - platformFeeCents - providerFeeCents;
      const reference = `cg-${church.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const txn = await storage.createChurchTransaction({
        churchId: church.id,
        categoryId: categoryId ? Number(categoryId) : null,
        categoryName: categoryName || "General",
        donorFirebaseUid: donorFirebaseUid ?? null,
        donorName: isAnonymous ? null : (donorName ?? null),
        donorEmail: isAnonymous ? null : (donorEmail ?? null),
        isAnonymous: !!isAnonymous,
        note: note ?? null,
        currency: settings.currency ?? "USD",
        grossAmount: grossCents,
        platformFeeAmount: platformFeeCents,
        providerFeeAmount: providerFeeCents,
        churchNetAmount: churchNetCents,
        status: "pending",
        payoutStatus: "pending",
        stripeSessionId: null,
        stripePaymentIntentId: null,
        reference,
      });
      const stripe = (await import("stripe")).default;
      const stripeClient = new stripe(stripeKey);
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      const description = `${categoryName} — ${church.name}${!isAnonymous && donorName ? ` — From: ${donorName}` : ""}${note ? ` — "${note}"` : ""}`;
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: (settings.currency ?? "USD").toLowerCase(),
            product_data: { name: `${church.name} — ${categoryName}`, description },
            unit_amount: grossCents,
          },
          quantity: 1,
        }],
        metadata: { reference, txnId: String(txn.id), churchId: String(church.id) },
        customer_email: !isAnonymous && donorEmail ? donorEmail : undefined,
        success_url: `${baseUrl}/church/${church.slug}/giving/success?ref=${reference}`,
        cancel_url: `${baseUrl}/church/${church.slug}/giving`,
      });
      await db.update(churchTransactions).set({ stripeSessionId: session.id }).where(eq(churchTransactions.id, txn.id));
      res.json({ checkoutUrl: session.url, reference });
    } catch (err: any) {
      console.error("[ChurchGiving] Stripe error:", err.message || err);
      res.status(500).json({ message: "Payment could not be started. Please try again." });
    }
  });
app.get("/api/churches/slug/:slug/giving/confirm", async (req, res) => {
    try {
      const { ref } = req.query;
      if (!ref || typeof ref !== "string") return res.status(400).json({ message: "Reference required" });
      const txn = await storage.getChurchTransactionByReference(ref);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      res.json(txn);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/church-giving-webhook", async (req, res) => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(503).end();
      const stripe = (await import("stripe")).default;
      const stripeClient = new stripe(stripeKey);
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_GIVING_WEBHOOK_SECRET;
      let event: any;
      if (webhookSecret && sig) {
        try {
          event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch { return res.status(400).send("Webhook signature verification failed."); }
      } else {
        event = req.body;
      }
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const txn = await storage.getChurchTransactionByStripeSession(session.id);
        if (txn) {
          await storage.updateChurchTransactionStatus(txn.id, "completed", session.payment_intent);
        }
      } else if (event.type === "checkout.session.expired") {
        const session = event.data.object;
        const txn = await storage.getChurchTransactionByStripeSession(session.id);
        if (txn && txn.status === "pending") {
          await storage.updateChurchTransactionStatus(txn.id, "failed");
        }
      }
      res.json({ received: true });
    } catch (err: any) {
      console.error("[GivingWebhook] Error:", err.message);
      res.status(500).end();
    }
  });
const deptAuth = async (req: any, deptId: number) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const uid = await verifyFirebaseToken(authHeader.slice(7));
    const dept = await storage.getDepartment(deptId);
    if (!dept) throw new Error("Not found");
    const churchMember = await storage.getChurchMember(dept.churchId, uid);
    if (!churchMember || churchMember.status !== "active") throw new Error("Not a church member");
    const deptMember = await storage.getMyDepartmentMembership(deptId, churchMember.id);
    const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
    const isChurchAdmin = ADMIN_ROLES.includes(churchMember.role ?? "");
    return { uid, churchMember, deptMember, dept, isChurchAdmin };
  };
app.get("/api/churches/:churchId/departments", async (req, res) => {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const uid = await getUid(req, res);
      if (!uid) return;
      const member = await storage.getChurchMember(churchId, uid);
      if (!member || member.status !== "active") return res.status(403).json({ message: "Not a member" });
      const depts = await storage.getDepartments(churchId);
      const deptMembers = await Promise.all(depts.map(d => storage.getMyDepartmentMembership(d.id, member.id)));
      res.json(depts.map((d, i) => ({ ...d, myMembership: deptMembers[i] ?? null })));
    } catch (e: any) { res.status(500).json({ message: e.message ?? "Server error" }); }
  });
app.post("/api/churches/:churchId/departments", async (req, res) => {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const uid = await getUid(req, res);
      if (!uid) return;
      const member = await storage.getChurchMember(churchId, uid);
      const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor", "ministry_leader"];
      if (!member || !ADMIN_ROLES.includes(member.role ?? "")) return res.status(403).json({ message: "Insufficient permissions" });
      const { name, type, description, logoUrl, bannerUrl } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
      if (!description?.trim()) return res.status(400).json({ message: "Description is required" });
      const normalizedLogoUrl = logoUrl?.trim() || null;
      const normalizedBannerUrl = bannerUrl?.trim() || null;
      const isValidHttpsUrl = (v: string) => { try { const u = new URL(v); return u.protocol === "https:"; } catch { return false; } };
      if (normalizedLogoUrl && !isValidHttpsUrl(normalizedLogoUrl)) return res.status(400).json({ message: "Logo URL must be a valid https:// URL" });
      if (normalizedBannerUrl && !isValidHttpsUrl(normalizedBannerUrl)) return res.status(400).json({ message: "Banner URL must be a valid https:// URL" });
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const dept = await storage.createDepartment({ churchId, name: name.trim(), slug, type: type ?? "Custom", description: description.trim(), logoUrl: normalizedLogoUrl, bannerUrl: normalizedBannerUrl, inviteCode, isActive: true, createdBy: member.id });
      await storage.addDepartmentMember(dept.id, member.id, "leader");
      res.status(201).json(dept);
    } catch (e: any) { res.status(500).json({ message: e.message ?? "Server error" }); }
  });
app.get("/api/churches/departments/:deptId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { churchMember, deptMember, dept, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a department member" });
      const members = await storage.getDepartmentMembers(deptId);
      res.json({ ...dept, myMembership: deptMember ?? null, memberCount: members.length });
    } catch (e: any) { res.status(e.message === "Not found" ? 404 : e.message === "Unauthorized" ? 401 : 403).json({ message: e.message }); }
  });
app.put("/api/churches/departments/:deptId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember, dept } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader" || deptMember?.role === "assistant_leader";
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { name, type, description, logoUrl, bannerUrl } = req.body;
      const updated = await storage.updateDepartment(deptId, { name, type, description, logoUrl, bannerUrl });
      if (dept) {
        const changes: string[] = [];
        if (name && name !== dept.name) changes.push(`name: "${dept.name}"→"${name}"`);
        if (type && type !== dept.type) changes.push(`type: "${dept.type}"→"${type}"`);
        if (description !== undefined && description !== dept.description) changes.push("description changed");
        if (logoUrl !== undefined && logoUrl !== dept.logoUrl) changes.push("logo changed");
        if (bannerUrl !== undefined && bannerUrl !== dept.bannerUrl) changes.push("banner changed");
        if (changes.length > 0) {
          storage.createAuditLog({ churchId: dept.churchId, departmentId: deptId, action: "department_edited", previousValue: dept.name, newValue: changes.join("; "), actorUid: churchMember.firebaseUid, actorRole: churchMember.role }).catch(() => {});
          // Notify all active department members of any relevant update
          const deptMembers = await storage.getDepartmentMembers(deptId);
          const changesSummary = changes.join(", ");
          for (const dm of deptMembers) {
            const memberEmail = dm.member?.email;
            const memberName = dm.member?.displayName ?? dm.member?.email ?? "Member";
            if (memberEmail) {
              storage.createInboxThread(
                { userEmail: memberEmail, userName: memberName, subject: `Department Updated: ${dept.name}`, category: "General" },
                `Dear ${memberName},\n\nThe "${dept.name}" department has been updated by church leadership. Changes: ${changesSummary}.\n\nIf you have any questions, please contact church leadership.\n\nGod bless,\nChurch Leadership`
              ).catch(() => {});
            }
          }
        }
      }
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.post("/api/churches/departments/:deptId/logo", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader" || deptMember?.role === "assistant_leader";
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { logoUrl } = req.body;
      if (!logoUrl || typeof logoUrl !== "string") return res.status(400).json({ message: "logoUrl is required" });
      const updated = await storage.updateDepartment(deptId, { logoUrl });
      res.json(updated);
    } catch (e: any) { res.status(e.message === "Not found" ? 404 : e.message === "Unauthorized" ? 401 : 500).json({ message: e.message }); }
  });
app.delete("/api/churches/departments/:deptId/logo", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader" || deptMember?.role === "assistant_leader";
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const updated = await storage.updateDepartment(deptId, { logoUrl: null });
      res.json(updated);
    } catch (e: any) { res.status(e.message === "Not found" ? 404 : e.message === "Unauthorized" ? 401 : 500).json({ message: e.message }); }
  });
app.delete("/api/churches/departments/:deptId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { isChurchAdmin } = await deptAuth(req, deptId);
      if (!isChurchAdmin) return res.status(403).json({ message: "Only church admins can delete departments" });
      await storage.deleteDepartment(deptId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.get("/api/churches/departments/:deptId/members", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, dept } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      const members = await storage.getDepartmentMembers(deptId);
      const profiles = await Promise.all(
        members.map(m => storage.getChurchMemberProfile(dept.churchId, m.member.firebaseUid ?? "").catch(() => null))
      );
      res.json(members.map((m, i) => ({
        ...m,
        member: { id: m.member.id, displayName: m.member.displayName, avatarUrl: profiles[i]?.photoUrl ?? null, role: m.member.role }
      })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.post("/api/churches/departments/:deptId/members", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, dept } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader" || deptMember?.role === "assistant_leader";
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { churchMemberId, role } = req.body;
      const added = await storage.addDepartmentMember(deptId, parseInt(churchMemberId), role ?? "member");
      res.json(added);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.delete("/api/churches/departments/:deptId/members/:memberId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    const memberId = parseInt(req.params.memberId);
    if (isNaN(deptId) || isNaN(memberId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const isDeptLeader = deptMember?.role === "leader";
      const isSelf = churchMember.id === memberId;
      if (!isDeptLeader && !isChurchAdmin && !isSelf) return res.status(403).json({ message: "Not authorized" });
      await storage.removeDepartmentMember(deptId, memberId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.patch("/api/churches/departments/:deptId/members/:memberId/role", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    const memberId = parseInt(req.params.memberId);
    if (isNaN(deptId) || isNaN(memberId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (deptMember?.role !== "leader" && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { role } = req.body;
      const updated = await storage.updateDepartmentMemberRole(deptId, memberId, role);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.post("/api/churches/departments/join", async (req, res) => {
    try {
      const uid = await getUid(req, res);
      if (!uid) return;
      const { inviteCode, email, displayName } = req.body;
      if (!inviteCode) return res.status(400).json({ message: "Invite code required" });
      const dept = await storage.getDepartmentByInviteCode(inviteCode.trim().toUpperCase());
      if (!dept || !dept.isActive) return res.status(404).json({ message: "Invalid or inactive invite code" });
      const church = await storage.getChurch(dept.churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      // If user is not yet a church member, add them first
      let member = await storage.getChurchMember(dept.churchId, uid);
      if (!member) {
        const initialStatus = church.approvalMode === "auto_approve" ? "active" : "pending";
        member = await storage.addChurchMember({
          churchId: dept.churchId, firebaseUid: uid, email: email || "",
          displayName: displayName || null, role: "member", status: initialStatus,
          invitedGroupId: null, inviteCodeUsed: null,
        });
        if (initialStatus === "pending") {
          return res.json({ message: "Your church membership request is pending approval.", pending: true, church });
        }
      } else if (member.status !== "active") {
        return res.json({ message: "Your church membership is pending approval.", pending: true, church });
      }
      // Add to department (idempotent)
      const existing = await storage.getMyDepartmentMembership(dept.id, member.id);
      if (existing) return res.json({ message: "Already a member of this department", dept, church });
      const deptMember = await storage.addDepartmentMember(dept.id, member.id, "member");
      res.json({ message: "Joined department successfully", dept, deptMember, church });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.get("/api/churches/departments/:deptId/posts", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const posts = await storage.getDepartmentPosts(deptId, type, 100);
      res.json(posts);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.post("/api/churches/departments/:deptId/posts", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      const { type, title, content, fileUrl, fileName } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content required" });
      const LEADER_ROLES = ["leader", "assistant_leader", "secretary"];
      if (type === "announcement" && !LEADER_ROLES.includes(deptMember?.role ?? "") && !isChurchAdmin) {
        return res.status(403).json({ message: "Only leaders can post announcements" });
      }
      const post = await storage.createDepartmentPost({ departmentId: deptId, authorMemberId: churchMember.id, type: type ?? "message", title, content: content.trim(), fileUrl, fileName, isPinned: false });
      res.status(201).json(post);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.delete("/api/churches/departments/:deptId/posts/:postId", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    const postId = parseInt(req.params.postId);
    if (isNaN(deptId) || isNaN(postId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const posts = await storage.getDepartmentPosts(deptId, undefined, 200);
      const post = posts.find(p => p.id === postId);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (post.authorMemberId !== churchMember.id && !isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDepartmentPost(postId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.patch("/api/churches/departments/:deptId/posts/:postId/pin", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    const postId = parseInt(req.params.postId);
    if (isNaN(deptId) || isNaN(postId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      await storage.pinDepartmentPost(postId, req.body.isPinned === true);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.get("/api/churches/departments/:deptId/events", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getDepartmentEvents(deptId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.post("/api/churches/departments/:deptId/events", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Only leaders can create events" });
      const { title, description, location, startDate, endDate, isAllDay } = req.body;
      if (!title?.trim() || !startDate) return res.status(400).json({ message: "Title and startDate required" });
      const event = await storage.createDepartmentEvent({ departmentId: deptId, createdBy: churchMember.id, title: title.trim(), description, location, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : undefined, isAllDay: isAllDay ?? false });
      res.status(201).json(event);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.put("/api/churches/departments/:deptId/events/:eventId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const eventId = parseInt(req.params.eventId);
    if (isNaN(deptId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { title, description, location, startDate, endDate, isAllDay } = req.body;
      const updated = await storage.updateDepartmentEvent(eventId, { title, description, location, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, isAllDay });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.delete("/api/churches/departments/:deptId/events/:eventId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const eventId = parseInt(req.params.eventId);
    if (isNaN(deptId) || isNaN(eventId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDepartmentEvent(eventId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.get("/api/churches/departments/:deptId/tasks", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      res.json(await storage.getDepartmentTasks(deptId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.post("/api/churches/departments/:deptId/tasks", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader", "secretary"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Only leaders can create tasks" });
      const { title, description, assignedTo, dueDate, priority } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title required" });
      const task = await storage.createDepartmentTask({ departmentId: deptId, createdBy: churchMember.id, title: title.trim(), description, assignedTo: assignedTo ? parseInt(assignedTo) : undefined, dueDate: dueDate ? new Date(dueDate) : undefined, status: "pending", priority: priority ?? "normal" });
      res.status(201).json(task);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.patch("/api/churches/departments/:deptId/tasks/:taskId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const taskId = parseInt(req.params.taskId);
    if (isNaN(deptId) || isNaN(taskId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      if (!deptMember && !isChurchAdmin) return res.status(403).json({ message: "Not a member" });
      const updated = await storage.updateDepartmentTask(taskId, req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.delete("/api/churches/departments/:deptId/tasks/:taskId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const taskId = parseInt(req.params.taskId);
    if (isNaN(deptId) || isNaN(taskId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDepartmentTask(taskId);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.get("/api/churches/departments/:deptId/attendance", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader", "secretary"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Only leaders can view attendance" });
      res.json(await storage.getDepartmentAttendance(deptId));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.post("/api/churches/departments/:deptId/attendance", async (req, res) => {
    const deptId = parseInt(req.params.deptId);
    if (isNaN(deptId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin, churchMember } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader", "secretary"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { sessionDate, sessionTitle, attendeeIds } = req.body;
      if (!sessionDate || !Array.isArray(attendeeIds)) return res.status(400).json({ message: "sessionDate and attendeeIds[] required" });
      const session = await storage.createDepartmentAttendance({ departmentId: deptId, sessionDate: new Date(sessionDate), sessionTitle: sessionTitle ?? null, attendeeIds: attendeeIds.map(Number), createdBy: churchMember.id });
      res.status(201).json(session);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.patch("/api/churches/departments/:deptId/attendance/:sessionId", async (req, res) => {
    const deptId = parseInt(req.params.deptId); const sessionId = parseInt(req.params.sessionId);
    if (isNaN(deptId) || isNaN(sessionId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const { deptMember, isChurchAdmin } = await deptAuth(req, deptId);
      const isDeptLeader = ["leader", "assistant_leader", "secretary"].includes(deptMember?.role ?? "");
      if (!isDeptLeader && !isChurchAdmin) return res.status(403).json({ message: "Not authorized" });
      const { attendeeIds } = req.body;
      const updated = await storage.updateDepartmentAttendance(sessionId, { attendeeIds: Array.isArray(attendeeIds) ? attendeeIds.map(Number) : undefined });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
app.get("/api/churches/:id/giving/my-history", async (req, res) => {
    const churchId = parseInt(req.params.id);
    if (isNaN(churchId)) return res.status(400).json({ message: "Invalid church ID" });
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
      const { auth } = await import("./firebase-admin.js");
      const decoded = await auth.verifyIdToken(authHeader.slice(7));
      const uid = decoded.uid;
      const txns = await storage.getMyGivingHistory(churchId, uid, 50);
      res.json(txns);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.post("/api/churches/:id/giving/seed-categories", async (req, res) => {
    const churchId = parseInt(req.params.id);
    if (isNaN(churchId)) return res.status(400).json({ message: "Invalid church ID" });
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
      const { auth } = await import("./firebase-admin.js");
      const decoded = await auth.verifyIdToken(authHeader.slice(7));
      const uid = decoded.uid;
      const church = await storage.getChurch(churchId);
      if (!church) return res.status(404).json({ message: "Church not found" });
      const member = await storage.getChurchMember(churchId, uid);
      const ADMIN_ROLES = ["owner", "lead_pastor", "administrator", "associate_pastor"];
      if (!member || !ADMIN_ROLES.includes(member.role ?? "")) return res.status(403).json({ message: "Not authorized" });
      const cats = await storage.seedDefaultGivingCategories(churchId);
      res.json(cats);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/admin/giving/stats", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const stats = await storage.getAllGivingStats();
      res.json(stats);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/admin/giving/platform-settings", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const fee = await storage.getGlobalGivingSetting("platform_fee_percent");
      res.json({ platform_fee_percent: fee ?? "2.5" });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.patch("/api/admin/giving/platform-settings", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const { platform_fee_percent } = req.body;
      const val = parseFloat(platform_fee_percent);
      if (isNaN(val) || val < 0 || val > 20) return res.status(400).json({ message: "Fee must be between 0 and 20%" });
      await storage.setGlobalGivingSetting("platform_fee_percent", String(val), "admin");
      res.json({ platform_fee_percent: String(val) });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/admin/giving/transactions", async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ message: "Forbidden" });
    try {
      const txns = await storage.getAllGivingTransactions(200);
      res.json(txns);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/user/profile", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    try {
      const profile = await storage.getUserProfile(uid);
      res.json(profile ?? null);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.put("/api/user/profile", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    const { displayName, email, country, profilePictureUrl, emailConsentMinistry, emailConsentNotifications } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });
    try {
      const profile = await storage.upsertUserProfile({
        firebaseUid: uid,
        email,
        displayName: displayName ?? null,
        country: country ?? null,
        profilePictureUrl: profilePictureUrl ?? null,
        emailConsentMinistry: !!emailConsentMinistry,
        emailConsentNotifications: !!emailConsentNotifications,
      });
      res.json(profile);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.patch("/api/user/profile", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    try {
      const allowed: Record<string, any> = {};
      const fields = ["displayName", "country", "profilePictureUrl", "emailConsentMinistry", "emailConsentNotifications", "showPictureOnPromise"];
      for (const f of fields) {
        if (f in req.body) allowed[f] = req.body[f];
      }
      const profile = await storage.updateUserProfile(uid, allowed);
      res.json(profile);
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/user/profile/picture", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    try {
      const profile = await storage.getUserProfile(uid);
      if (!profile?.profilePictureUrl) {
        return res.status(404).json({ message: "No profile picture" });
      }

      // Existing profile pictures use /objects/uploads/... paths.
      // That route now resolves directly to Cloudflare R2.
      return res.redirect(302, profile.profilePictureUrl);
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });
app.post("/api/user/activity", requireUser, async (req, res) => {
    const uid = (req as any).uid as string;
    try {
      await storage.recordUserActivity(uid);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Server error" }); }
  });
app.get("/api/admin/church-oversight", requireAdmin, async (req, res) => {
    try {
      const [churches, summary] = await Promise.all([
        storage.getChurchOversightData(),
        storage.getChurchOversightSummary(),
      ]);
      res.json({ churches, summary });
    } catch (err) {
      console.error("Church oversight error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });
}
