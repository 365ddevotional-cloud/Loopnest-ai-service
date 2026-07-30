import { db } from "./db";
import {
  devotionals,
  prayerRequests,
  prayerReplies,
  threadMessages,
  autoReplyTemplates,
  prayerAttachments,
  supportTickets,
  contactMessages,
  generalInquiries,
  feedbackMessages,
  partnershipInquiries,
  biblePassages,
  sundaySchoolLessons,
  testimonies,
  prayerFollowUps,
  inboxThreads,
  inboxMessages,
  songs,
  songTestimonies,
  givingMethods,
  userSavedSongs,
  userFavoriteSongs,
  userDownloadHistory,
  songCollections,
  songCollectionItems,
  songEngagementEvents,
  churchGivingSettings,
  churchGivingCategories,
  churchDepartments,
  churchDepartmentMembers,
  churchDepartmentPosts,
  groups,
  groupMembers,
  groupPrayerRequests,
  groupMessages as groupMessagesTable,
  groupDevotionalShares,
  groupDevotionalReactions,
  groupAnnouncements,
  churchDepartmentEvents,
  churchDepartmentTasks,
  churchDepartmentAttendance,
  type ChurchDepartment,
  type InsertChurchDepartment,
  type ChurchDepartmentMember,
  type ChurchDepartmentPost,
  type ChurchDepartmentEvent,
  type InsertChurchDepartmentEvent,
  type ChurchDepartmentTask,
  type InsertChurchDepartmentTask,
  type ChurchDepartmentAttendance,
  type InsertChurchDepartmentAttendance,
  churchPayoutConfigs,
  churchTransactions,
  globalGivingSettings,
  userPlaybackHistory,
  userMusicSettings,
  userSavedDevotionals,
  userDevotionalHistory,
  userDevotionalStreak,
  userDevotionalNotes,
  type Devotional,
  type InsertDevotional,
  type UpdateDevotionalRequest,
  type PrayerRequest,
  type InsertPrayerRequest,
  type PrayerReply,
  type InsertPrayerReply,
  type ThreadMessage,
  type InsertThreadMessage,
  type AutoReplyTemplate,
  type InsertAutoReplyTemplate,
  type PrayerAttachment,
  type InsertPrayerAttachment,
  type SupportTicket,
  type InsertSupportTicket,
  type ContactMessage,
  type InsertContactMessage,
  type GeneralInquiry,
  type InsertGeneralInquiry,
  type FeedbackMessage,
  type InsertFeedback,
  type PartnershipInquiry,
  type InsertPartnership,
  type BiblePassage,
  type InsertBiblePassage,
  type BibleTranslation,
  type SundaySchoolLesson,
  type InsertSundaySchoolLesson,
  type Testimony,
  type InsertTestimony,
  type PrayerFollowUp,
  type InboxThread,
  type InsertInboxThread,
  type InboxMessage,
  type InsertInboxMessage,
  type Song,
  type InsertSong,
  type GivingMethod,
  type InsertGivingMethod,
  type SongTestimony,
  type UserSavedSong,
  type UserFavoriteSong,
  type UserDownloadRecord,
  type UserPlaybackHistory,
  type UserMusicSettings,
  type SongCollection,
  type InsertSongCollection,
  type SongCollectionItem,
  type UserSavedDevotional,
  type UserDevotionalHistory,
  type UserDevotionalStreak,
  type UserDevotionalNote,
  type InsertSongTestimony,
  type DonationConfirmation,
  type InsertDonationConfirmation,
  donationConfirmations,
  churches,
  churchMembers,
  churchInvitations,
  churchSermons,
  churchAnnouncements,
  churchGroups,
  churchGroupMembers,
  churchPrayerRequests,
  churchActivityLog,
  type Church,
  type InsertChurch,
  type ChurchMember,
  type InsertChurchMember,
  type ChurchMemberProfile,
  type ChurchInvitation,
  type InsertChurchInvitation,
  type ChurchSermon,
  type InsertChurchSermon,
  type ChurchAnnouncement,
  type InsertChurchAnnouncement,
  type ChurchGroup,
  type InsertChurchGroup,
  type ChurchGroupMember,
  type InsertChurchGroupMember,
  type ChurchPrayerRequest,
  type InsertChurchPrayerRequest,
  type ChurchActivity,
  type InsertChurchActivity,
  type ChurchGivingSettings,
  type ChurchGivingCategory,
  type ChurchPayoutConfig,
  type ChurchTransaction,
  type GlobalGivingSetting,
  type ChurchConversation,
  type InsertChurchConversation,
  type ChurchConversationParticipant,
  type InsertChurchConversationParticipant,
  type ChurchMessage,
  type InsertChurchMessage,
  churchMemberProfiles,
  churchConversations,
  churchConversationParticipants,
  churchMessages,
  churchMessageReads,
  churchSermonBookmarks,
  churchSermonNotes,
  churchPastorNotes,
  type ChurchSermonBookmark,
  type ChurchSermonNote,
  type ChurchPastorNote,
  type InsertChurchPastorNote,
  userProfiles,
  userActivityDays,
  type UserProfile,
  type InsertUserProfile,
  auditLogs,
  churchDeletionRequests,
  type ChurchDeletionRequest,
  complianceCases,
  complianceCaseResponses,
  complianceAppeals,
  platformAdminThreads,
  platformAdminMessages,
  platformAnnouncements,
  platformAnnouncementReads,
  type PlatformAnnouncementRead,
  type ComplianceCase,
  type InsertComplianceCase,
  type ComplianceCaseResponse,
  type InsertComplianceCaseResponse,
  type ComplianceAppeal,
  type InsertComplianceAppeal,
  type PlatformAdminThread,
  type InsertPlatformAdminThread,
  type PlatformAdminMessage,
  type InsertPlatformAdminMessage,
  type PlatformAnnouncement,
  type InsertPlatformAnnouncement,
  type Group,
  type InsertGroup,
  type GroupMember,
  type InsertGroupMember,
  type GroupPrayerRequest,
  type InsertGroupPrayerRequest,
  type GroupMessage,
  type InsertGroupMessage,
  type GroupDevotionalShare,
  type InsertGroupDevotionalShare,
  type GroupDevotionalReaction,
  type InsertGroupDevotionalReaction,
  type GroupAnnouncement,
  type InsertGroupAnnouncement,
} from "@shared/schema";
import { eq, desc, asc, and, isNull, or, ilike, lte, notInArray, inArray, sql, gte, count, countDistinct } from "drizzle-orm";

export interface ChurchDashboardStats {
  activeMembers: number;
  pendingMembers: number;
  upcomingEvents: number;
  unreadMessages: number;
  activePrayers: number;
  announcements: number;
  openTasks: number;
  publishedNotes: number;
  activeDepartments: number;
  sundaySchoolLessons: number;
  complianceNotices: number;
  nextEvent: { title: string; start_date: string; location?: string; dept_name?: string } | null;
  latestAnnouncement: { title: string; created_at: string } | null;
  latestLesson: { title: string; date: string } | null;
  pendingMembersList: Array<{ id: number; display_name: string; email: string }>;
  activePrayersList: Array<{ id: number; title: string; display_name: string }>;
  recentActivity: Array<{ type: string; description: string; created_at: string }>;
}

export interface IStorage {
  getDevotionals(): Promise<Devotional[]>;
  getDevotional(id: number): Promise<Devotional | undefined>;
  getDevotionalByDate(date: string): Promise<Devotional | undefined>;
  getLatestDevotional(): Promise<Devotional | undefined>;
  createDevotional(devotional: InsertDevotional): Promise<Devotional>;
  updateDevotional(id: number, updates: UpdateDevotionalRequest): Promise<Devotional>;
  upsertDevotional(devotional: InsertDevotional): Promise<Devotional>;
  deleteDevotional(id: number): Promise<void>;
  
  // Prayer Requests
  getPrayerRequests(): Promise<PrayerRequest[]>;
  getPrayerRequest(id: number): Promise<PrayerRequest | undefined>;
  createPrayerRequest(request: InsertPrayerRequest): Promise<PrayerRequest>;
  markPrayerRequestRead(id: number): Promise<PrayerRequest>;
  
  // Prayer Replies
  getRepliesForRequest(requestId: number): Promise<PrayerReply[]>;
  createPrayerReply(reply: InsertPrayerReply): Promise<PrayerReply>;
  
  // Thread Messages
  getThreadMessages(requestId: number): Promise<ThreadMessage[]>;
  createThreadMessage(message: InsertThreadMessage): Promise<ThreadMessage>;
  markAdminMessagesRead(requestId: number): Promise<number>;
  
  // Prayer Requests by Email
  getPrayerRequestsByEmail(email: string): Promise<PrayerRequest[]>;

  // Prayer Requests by Firebase UID (user account)
  getPrayerRequestsByUid(uid: string): Promise<PrayerRequest[]>;
  linkPrayerToUid(id: number, uid: string): Promise<void>;
  markPrayerAnswered(id: number, uid: string, answerNote?: string): Promise<PrayerRequest>;
  withdrawPrayerRequest(id: number, uid: string): Promise<PrayerRequest>;
  updatePrayerRequestByUser(id: number, uid: string, data: { subject?: string; message?: string }): Promise<PrayerRequest>;

  // Prayer Request Status
  updatePrayerRequestStatus(id: number, status: string): Promise<PrayerRequest>;
  updatePrayerRequestCategory(id: number, category: string): Promise<PrayerRequest>;
  
  // Auto-Reply Templates
  getAutoReplyTemplate(templateType: string): Promise<AutoReplyTemplate | undefined>;
  getAutoReplyTemplates(): Promise<AutoReplyTemplate[]>;
  upsertAutoReplyTemplate(template: InsertAutoReplyTemplate): Promise<AutoReplyTemplate>;
  
  // Prayer Attachments
  getAttachmentsForRequest(requestId: number): Promise<PrayerAttachment[]>;
  createPrayerAttachment(attachment: InsertPrayerAttachment): Promise<PrayerAttachment>;
  
  // Support Tickets
  getSupportTickets(): Promise<SupportTicket[]>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  
  // Contact Messages
  getContactMessages(): Promise<ContactMessage[]>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  
  // General Inquiries
  getGeneralInquiries(): Promise<GeneralInquiry[]>;
  createGeneralInquiry(inquiry: InsertGeneralInquiry): Promise<GeneralInquiry>;
  
  // Feedback
  getFeedback(): Promise<FeedbackMessage[]>;
  createFeedback(feedback: InsertFeedback): Promise<FeedbackMessage>;
  
  // Partnership
  getPartnershipInquiries(): Promise<PartnershipInquiry[]>;
  createPartnershipInquiry(inquiry: InsertPartnership): Promise<PartnershipInquiry>;
  
  // Testimonies
  getApprovedTestimonies(): Promise<Testimony[]>;
  getAllTestimonies(): Promise<Testimony[]>;
  createTestimony(testimony: InsertTestimony): Promise<Testimony>;
  approveTestimony(id: number): Promise<Testimony>;
  rejectTestimony(id: number): Promise<Testimony>;
  deleteTestimony(id: number): Promise<void>;
  // User-linked testimony workflow
  getUserTestimony(prayerRequestId: number, uid: string): Promise<Testimony | undefined>;
  upsertUserTestimony(prayerRequestId: number, uid: string, data: { name?: string; message: string }): Promise<Testimony>;
  submitTestimonyForReview(id: number, uid: string): Promise<Testimony>;

  // Prayer Follow-Ups
  getFollowUpsForRequest(requestId: number): Promise<PrayerFollowUp[]>;
  createFollowUp(requestId: number, dayNumber: number, message: string): Promise<PrayerFollowUp>;
  getRequestsNeedingFollowUp(dayNumber: number): Promise<PrayerRequest[]>;

  // Inbox
  createInboxThread(thread: InsertInboxThread, firstMessage: string): Promise<InboxThread>;
  getInboxThreadsByEmail(email: string): Promise<InboxThread[]>;
  getAllInboxThreads(filters?: { category?: string; status?: string }): Promise<InboxThread[]>;
  getInboxThread(id: number): Promise<InboxThread | undefined>;
  getInboxMessages(threadId: number, viewerType: "user" | "admin"): Promise<InboxMessage[]>;
  createInboxMessage(message: InsertInboxMessage): Promise<InboxMessage>;
  updateInboxThreadStatus(id: number, status: string): Promise<InboxThread>;
  markInboxThreadRead(id: number, readerType: "user" | "admin"): Promise<void>;
  deleteInboxMessage(id: number, viewerType: "user" | "admin"): Promise<void>;
  getLastInboxMessage(threadId: number): Promise<InboxMessage | undefined>;
  cleanupOldInboxMessages(daysOld: number): Promise<number>;

  // Bible Passages
  getBiblePassage(reference: string, translation: BibleTranslation): Promise<BiblePassage | undefined>;
  getBiblePassages(references: string[], translation: BibleTranslation): Promise<BiblePassage[]>;
  getAllBiblePassages(translation: BibleTranslation): Promise<BiblePassage[]>;
  createBiblePassage(passage: InsertBiblePassage): Promise<BiblePassage>;
  upsertBiblePassage(passage: InsertBiblePassage): Promise<BiblePassage>;

  // Sunday School
  getSundaySchoolLessons(): Promise<SundaySchoolLesson[]>;
  getSundaySchoolLesson(id: number): Promise<SundaySchoolLesson | undefined>;
  createSundaySchoolLesson(lesson: InsertSundaySchoolLesson): Promise<SundaySchoolLesson>;
  updateSundaySchoolLesson(id: number, updates: Partial<InsertSundaySchoolLesson>): Promise<SundaySchoolLesson>;
  deleteSundaySchoolLesson(id: number): Promise<void>;

  // Songs — Song of the Week / SpiritTone Music
  getFeaturedSong(): Promise<Song | undefined>;
  getPublicSongs(): Promise<Song[]>;
  getSongs(): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  getSongBySlug(slug: string): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: number, updates: Partial<InsertSong>): Promise<Song>;
  deleteSong(id: number): Promise<void>;
  getSongTestimonies(songId?: number): Promise<SongTestimony[]>;
  createSongTestimony(testimony: InsertSongTestimony): Promise<SongTestimony>;
  updateSongTestimony(id: number, data: Partial<SongTestimony>): Promise<SongTestimony>;
  deleteSongTestimony(id: number): Promise<void>;

  // Giving Methods — Admin-managed voluntary support options
  getGivingMethods(activeOnly?: boolean): Promise<GivingMethod[]>;
  createGivingMethod(method: InsertGivingMethod): Promise<GivingMethod>;
  updateGivingMethod(id: number, data: Partial<InsertGivingMethod>): Promise<GivingMethod | undefined>;
  deleteGivingMethod(id: number): Promise<void>;

  // User Library — saved/favorite songs and download history keyed by Firebase UID
  getUserSavedSongs(uid: string): Promise<(UserSavedSong & { song: Song })[]>;
  saveSong(uid: string, songId: number): Promise<UserSavedSong>;
  unsaveSong(uid: string, songId: number): Promise<void>;
  isSongSaved(uid: string, songId: number): Promise<boolean>;

  getUserFavoriteSongs(uid: string): Promise<(UserFavoriteSong & { song: Song })[]>;
  favoriteSong(uid: string, songId: number): Promise<UserFavoriteSong>;
  unfavoriteSong(uid: string, songId: number): Promise<void>;
  isSongFavorited(uid: string, songId: number): Promise<boolean>;
  mergeLocalFavorites(uid: string, songIds: number[]): Promise<void>;

  getUserDownloadHistory(uid: string): Promise<(UserDownloadRecord & { song: Song | null })[]>;
  recordDownload(uid: string, songId: number): Promise<UserDownloadRecord>;
  getUserPlaybackHistory(uid: string): Promise<(UserPlaybackHistory & { song: Song | null })[]>;
  upsertPlaybackPosition(uid: string, songId: number, lastPosition: number, durationSecs: number, progressPercent: number): Promise<void>;
  getUserMusicSettings(uid: string): Promise<UserMusicSettings | null>;
  upsertUserMusicSettings(uid: string, settings: Partial<Pick<UserMusicSettings, "autoplayNext" | "rememberPosition" | "defaultSpeed" | "repeatMode" | "shuffle">>): Promise<UserMusicSettings>;

  // Song Collections
  getSongCollections(): Promise<SongCollection[]>;
  getPublicSongCollections(): Promise<(SongCollection & { songs: Song[] })[]>;
  createSongCollection(data: InsertSongCollection): Promise<SongCollection>;
  updateSongCollection(id: number, data: Partial<InsertSongCollection>): Promise<SongCollection>;
  deleteSongCollection(id: number): Promise<void>;
  addSongToCollection(collectionId: number, songId: number, displayOrder?: number): Promise<void>;
  removeSongFromCollection(collectionId: number, songId: number): Promise<void>;
  getCollectionSongIds(collectionId: number): Promise<number[]>;

  // Song Analytics
  recordSongEvent(songId: number, eventType: string, userId?: string, sessionId?: string): Promise<void>;
  getSongStats(songId: number): Promise<{ plays: number; shares: number; audioDownloads: number; videoDownloads: number; playsLast7: number; playsLast30: number }>;
  checkRecentPlay(songId: number, sessionId: string, minutesBack?: number): Promise<boolean>;

  // Phase F: Devotional Account Sync
  getSavedDevotionals(uid: string): Promise<(UserSavedDevotional & { devotional: Devotional })[]>;
  saveDevotional(uid: string, devotionalId: number): Promise<void>;
  unsaveDevotional(uid: string, devotionalId: number): Promise<void>;
  isDevotionalSaved(uid: string, devotionalId: number): Promise<boolean>;
  mergeLocalDevotionalSaves(uid: string, devotionalIds: number[]): Promise<void>;
  recordDevotionalRead(uid: string, devotionalId: number): Promise<void>;
  getDevotionalHistory(uid: string): Promise<(UserDevotionalHistory & { devotional: Devotional })[]>;
  getDevotionalStreak(uid: string): Promise<UserDevotionalStreak | null>;
  upsertDevotionalStreak(uid: string, currentStreak: number, longestStreak: number, lastReadDate: string): Promise<UserDevotionalStreak>;
  getDevotionalNote(uid: string, devotionalId: number): Promise<UserDevotionalNote | null>;
  upsertDevotionalNote(uid: string, devotionalId: number, noteText: string): Promise<void>;
  deleteDevotionalNote(uid: string, devotionalId: number): Promise<void>;

  // Donation Confirmations
  createDonationConfirmation(data: InsertDonationConfirmation): Promise<DonationConfirmation>;
  getDonationConfirmations(): Promise<DonationConfirmation[]>;
  updateDonationConfirmationThankYouStatus(id: number, status: string): Promise<DonationConfirmation>;

  // Church Mode — Phase 2A
  createChurch(data: InsertChurch): Promise<Church>;
  getChurch(id: number): Promise<Church | undefined>;
  getChurchBySlug(slug: string): Promise<Church | undefined>;
  getChurchesByOwner(ownerId: string): Promise<Church[]>;
  updateChurch(id: number, data: Partial<InsertChurch>): Promise<Church>;
  deleteChurch(id: number): Promise<void>;
  addChurchMember(data: InsertChurchMember): Promise<ChurchMember>;
  getChurchMembers(churchId: number): Promise<ChurchMember[]>;
  getChurchMember(churchId: number, firebaseUid: string): Promise<ChurchMember | undefined>;
  getChurchMemberById(churchId: number, memberId: number): Promise<ChurchMember | undefined>;
  getUserChurches(firebaseUid: string): Promise<(ChurchMember & { church: Church })[]>;
  updateChurchMemberRole(id: number, role: string): Promise<ChurchMember>;
  updateChurchMemberStatus(id: number, status: string): Promise<ChurchMember>;
  removeChurchMember(churchId: number, firebaseUid: string): Promise<void>;
  createChurchInvitation(data: InsertChurchInvitation): Promise<ChurchInvitation>;
  getChurchInvitation(inviteCode: string): Promise<ChurchInvitation | undefined>;
  getChurchInvitations(churchId: number): Promise<ChurchInvitation[]>;
  useChurchInvitation(inviteCode: string): Promise<ChurchInvitation>;
  approveChurchInvitationUse(inviteCode: string): Promise<ChurchInvitation>;
  deactivateChurchInvitation(id: number): Promise<void>;
  deleteChurchInvitation(id: number): Promise<void>;
  // Church Member Profiles
  upsertChurchMemberProfile(data: Partial<ChurchMemberProfile> & { churchId: number; firebaseUid: string }): Promise<ChurchMemberProfile>;
  getChurchMemberProfile(churchId: number, firebaseUid: string): Promise<ChurchMemberProfile | undefined>;
  getChurchMemberProfilesByChurchId(churchId: number): Promise<ChurchMemberProfile[]>;
  // Church Messaging
  createChurchConversation(data: InsertChurchConversation): Promise<ChurchConversation>;
  getChurchConversations(churchId: number, firebaseUid: string, isLeader: boolean): Promise<ChurchConversation[]>;
  getChurchConversation(id: number): Promise<ChurchConversation | undefined>;
  updateChurchConversation(id: number, data: Partial<ChurchConversation>): Promise<ChurchConversation>;
  addConversationParticipant(data: InsertChurchConversationParticipant): Promise<ChurchConversationParticipant>;
  getConversationParticipants(conversationId: number): Promise<ChurchConversationParticipant[]>;
  isConversationParticipant(conversationId: number, firebaseUid: string): Promise<boolean>;
  createChurchMessage(data: InsertChurchMessage): Promise<ChurchMessage>;
  getChurchMessages(conversationId: number, limit?: number, offset?: number): Promise<ChurchMessage[]>;
  markMessagesRead(conversationId: number, firebaseUid: string): Promise<void>;
  getUnreadMessageCount(churchId: number, firebaseUid: string): Promise<number>;
  // Church Branding
  updateChurchBranding(churchId: number, data: { logoUrl?: string; bannerUrl?: string; themeColor?: string }): Promise<Church>;
  // Church Sermons
  createChurchSermon(data: InsertChurchSermon): Promise<ChurchSermon>;
  getChurchSermons(churchId: number): Promise<ChurchSermon[]>;
  updateChurchSermon(id: number, data: Partial<InsertChurchSermon>): Promise<ChurchSermon>;
  deleteChurchSermon(id: number): Promise<void>;
  // Sermon Bookmarks
  toggleSermonBookmark(sermonId: number, churchId: number, firebaseUid: string): Promise<boolean>;
  getSermonBookmarks(churchId: number, firebaseUid: string): Promise<number[]>;
  // Sermon Notes
  upsertSermonNote(sermonId: number, churchId: number, firebaseUid: string, body: string): Promise<ChurchSermonNote>;
  getSermonNote(sermonId: number, firebaseUid: string): Promise<ChurchSermonNote | undefined>;
  // Pastor Dashboard Stats
  getChurchDashboardStats(churchId: number): Promise<ChurchDashboardStats>;
  // Church Pastor Notes
  listChurchPastorNotes(churchId: number, adminAccess: boolean): Promise<ChurchPastorNote[]>;
  createChurchPastorNote(data: InsertChurchPastorNote): Promise<ChurchPastorNote>;
  updateChurchPastorNote(noteId: number, churchId: number, data: Partial<InsertChurchPastorNote> & { status?: string; publishedAt?: Date | null }): Promise<ChurchPastorNote>;
  // Church Announcements
  createChurchAnnouncement(data: InsertChurchAnnouncement): Promise<ChurchAnnouncement>;
  getChurchAnnouncements(churchId: number): Promise<ChurchAnnouncement[]>;
  updateChurchAnnouncement(id: number, data: Partial<InsertChurchAnnouncement>): Promise<ChurchAnnouncement>;
  deleteChurchAnnouncement(id: number): Promise<void>;
  // Church Groups
  createChurchGroup(data: InsertChurchGroup): Promise<ChurchGroup>;
  getChurchGroups(churchId: number): Promise<ChurchGroup[]>;
  updateChurchGroup(id: number, data: Partial<InsertChurchGroup>): Promise<ChurchGroup>;
  deleteChurchGroup(id: number): Promise<void>;
  getChurchGroupMembers(groupId: number): Promise<ChurchGroupMember[]>;
  addChurchGroupMember(data: InsertChurchGroupMember): Promise<ChurchGroupMember>;
  removeChurchGroupMember(groupId: number, firebaseUid: string): Promise<void>;
  getChurchGroupMember(groupId: number, firebaseUid: string): Promise<ChurchGroupMember | undefined>;
  // Church Prayer Requests
  createChurchPrayerRequest(data: InsertChurchPrayerRequest): Promise<ChurchPrayerRequest>;
  getChurchPrayerRequests(churchId: number, includeConfidential: boolean): Promise<ChurchPrayerRequest[]>;
  incrementPrayerCount(id: number): Promise<ChurchPrayerRequest>;
  updateChurchPrayerStatus(id: number, status: string): Promise<ChurchPrayerRequest>;
  deleteChurchPrayerRequest(id: number): Promise<void>;
  // Church Activity
  logChurchActivity(data: InsertChurchActivity): Promise<ChurchActivity>;
  getChurchActivity(churchId: number, limit?: number): Promise<ChurchActivity[]>;
  // Global admin
  getAllChurches(): Promise<Church[]>;
  updateChurchStatus(id: number, status: string): Promise<Church>;
  // Giving extras
  getMyGivingHistory(churchId: number, firebaseUid: string, limit?: number): Promise<ChurchTransaction[]>;
  seedDefaultGivingCategories(churchId: number): Promise<ChurchGivingCategory[]>;
  getAllGivingStats(): Promise<{ totalDonations: number; totalPlatformFee: number; totalChurchNet: number; count: number }>;
  // Departments
  getDepartments(churchId: number): Promise<ChurchDepartment[]>;
  getDepartment(id: number): Promise<ChurchDepartment | undefined>;
  getDepartmentBySlug(churchId: number, slug: string): Promise<ChurchDepartment | undefined>;
  getDepartmentByInviteCode(code: string): Promise<ChurchDepartment | undefined>;
  createDepartment(data: InsertChurchDepartment): Promise<ChurchDepartment>;
  updateDepartment(id: number, data: Partial<InsertChurchDepartment>): Promise<ChurchDepartment>;
  deleteDepartment(id: number): Promise<void>;
  getDepartmentMembers(departmentId: number): Promise<Array<ChurchDepartmentMember & { member: ChurchMember }>>;
  getMyDepartmentMembership(departmentId: number, churchMemberId: number): Promise<ChurchDepartmentMember | undefined>;
  addDepartmentMember(departmentId: number, churchMemberId: number, role?: string): Promise<ChurchDepartmentMember>;
  removeDepartmentMember(departmentId: number, churchMemberId: number): Promise<void>;
  updateDepartmentMemberRole(departmentId: number, churchMemberId: number, role: string): Promise<ChurchDepartmentMember>;
  getDepartmentPosts(departmentId: number, type?: string, limit?: number): Promise<Array<ChurchDepartmentPost & { authorName: string | null }>>;
  createDepartmentPost(data: Omit<typeof churchDepartmentPosts.$inferInsert, "id" | "createdAt" | "isDeleted">): Promise<ChurchDepartmentPost>;
  deleteDepartmentPost(id: number): Promise<void>;
  pinDepartmentPost(id: number, isPinned: boolean): Promise<void>;
  getDepartmentEvents(departmentId: number): Promise<ChurchDepartmentEvent[]>;
  createDepartmentEvent(data: InsertChurchDepartmentEvent): Promise<ChurchDepartmentEvent>;
  updateDepartmentEvent(id: number, data: Partial<InsertChurchDepartmentEvent>): Promise<ChurchDepartmentEvent>;
  deleteDepartmentEvent(id: number): Promise<void>;
  getDepartmentTasks(departmentId: number): Promise<ChurchDepartmentTask[]>;
  createDepartmentTask(data: InsertChurchDepartmentTask): Promise<ChurchDepartmentTask>;
  updateDepartmentTask(id: number, data: Partial<InsertChurchDepartmentTask>): Promise<ChurchDepartmentTask>;
  deleteDepartmentTask(id: number): Promise<void>;
  getDepartmentAttendance(departmentId: number): Promise<ChurchDepartmentAttendance[]>;
  createDepartmentAttendance(data: InsertChurchDepartmentAttendance): Promise<ChurchDepartmentAttendance>;
  updateDepartmentAttendance(id: number, data: Partial<InsertChurchDepartmentAttendance>): Promise<ChurchDepartmentAttendance>;

  // User Profiles
  getUserProfile(firebaseUid: string): Promise<UserProfile | undefined>;
  upsertUserProfile(data: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(firebaseUid: string, data: Partial<Omit<InsertUserProfile, "firebaseUid" | "email">>): Promise<UserProfile>;

  // Activity tracking (DAU/WAU/MAU)
  recordUserActivity(firebaseUid: string): Promise<void>;

  // Admin: church oversight aggregates
  getChurchOversightData(): Promise<any[]>;
  getChurchOversightSummary(): Promise<any>;

  // Admin: app analytics
  getAppAnalytics(): Promise<any>;

  // Pending members count
  getPendingMembersCount(churchId: number): Promise<number>;

  // Department archive (soft-delete with timestamp)
  archiveDepartment(id: number): Promise<ChurchDepartment>;

  // Audit log
  createAuditLog(data: { churchId?: number; departmentId?: number; action: string; previousValue?: string; newValue?: string; actorUid: string; actorRole?: string }): Promise<void>;

  // Church deletion requests
  createDeletionRequest(data: { churchId: number; ownerUid: string; ownerEmail: string; ownerName?: string; reason: string; explanation?: string }): Promise<ChurchDeletionRequest>;
  getDeletionRequests(status?: string): Promise<Array<ChurchDeletionRequest & { churchName: string; memberCount: number }>>;
  updateDeletionRequestStatus(id: number, status: string, reviewedBy: string, adminNote?: string): Promise<ChurchDeletionRequest>;
  getMyDeletionRequest(churchId: number, ownerUid: string): Promise<ChurchDeletionRequest | undefined>;

  // Platform governance
  updateChurchPlatformStatus(id: number, platformStatus: string, reviewNote?: string, reviewedBy?: string): Promise<Church>;
  getPendingReviewChurches(): Promise<Church[]>;
  getChurchesByPlatformStatus(status: string): Promise<Church[]>;

  // Compliance cases
  createComplianceCase(data: InsertComplianceCase): Promise<ComplianceCase>;
  getComplianceCases(churchId?: number): Promise<ComplianceCase[]>;
  getComplianceCase(id: number): Promise<ComplianceCase | undefined>;
  updateComplianceCase(id: number, data: Partial<ComplianceCase>): Promise<ComplianceCase>;
  createComplianceCaseResponse(data: InsertComplianceCaseResponse): Promise<ComplianceCaseResponse>;
  getComplianceCaseResponses(caseId: number): Promise<ComplianceCaseResponse[]>;

  // Appeals
  createComplianceAppeal(data: InsertComplianceAppeal): Promise<ComplianceAppeal>;
  getComplianceAppeals(churchId?: number): Promise<ComplianceAppeal[]>;
  updateComplianceAppeal(id: number, data: Partial<ComplianceAppeal>): Promise<ComplianceAppeal>;

  // Platform admin threads
  createPlatformAdminThread(data: InsertPlatformAdminThread): Promise<PlatformAdminThread>;
  getPlatformAdminThreads(churchId?: number): Promise<PlatformAdminThread[]>;
  getOwnerPlatformAdminThread(churchId: number, ownerUid: string): Promise<PlatformAdminThread | undefined>;
  getPlatformAdminThread(id: number): Promise<PlatformAdminThread | undefined>;
  updatePlatformAdminThread(id: number, data: Partial<PlatformAdminThread>): Promise<PlatformAdminThread>;
  createPlatformAdminMessage(data: InsertPlatformAdminMessage): Promise<PlatformAdminMessage>;
  getPlatformAdminMessages(threadId: number): Promise<PlatformAdminMessage[]>;

  // Platform announcements
  createPlatformAnnouncement(data: InsertPlatformAnnouncement): Promise<PlatformAnnouncement>;
  getPlatformAnnouncements(): Promise<PlatformAnnouncement[]>;
  getSentAnnouncementsForUser(firebaseUid: string): Promise<(PlatformAnnouncement & { isRead: boolean })[]>;
  markAnnouncementRead(announcementId: number, firebaseUid: string): Promise<void>;
  sendPlatformAnnouncement(id: number): Promise<PlatformAnnouncement>;

  // Governance summary for admin dashboard
  getGovernanceSummary(): Promise<{ pendingReview: number; openCases: number; pendingAppeals: number; pendingDeletions: number; recentApprovals: number; recentSuspensions: number }>;

  // ── Family / Group Mode ────────────────────────────────────────────────────
  createGroup(data: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getGroupByInviteCode(code: string): Promise<Group | undefined>;
  getUserGroups(firebaseUid: string): Promise<(GroupMember & { group: Group })[]>;
  updateGroup(id: number, data: Partial<InsertGroup>): Promise<Group>;
  deleteGroup(id: number): Promise<void>;
  // Members
  addGroupMember(data: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<GroupMember[]>;
  getGroupMember(groupId: number, firebaseUid: string): Promise<GroupMember | undefined>;
  updateGroupMemberRole(id: number, role: string): Promise<GroupMember>;
  removeGroupMember(groupId: number, firebaseUid: string): Promise<void>;
  // Prayer
  createGroupPrayerRequest(data: InsertGroupPrayerRequest): Promise<GroupPrayerRequest>;
  getGroupPrayerRequests(groupId: number): Promise<GroupPrayerRequest[]>;
  updateGroupPrayerStatus(id: number, status: string): Promise<GroupPrayerRequest>;
  incrementGroupPrayingCount(id: number): Promise<GroupPrayerRequest>;
  // Messages
  createGroupMessage(data: InsertGroupMessage): Promise<GroupMessage>;
  getGroupMessages(groupId: number, limit?: number): Promise<GroupMessage[]>;
  // Devotional shares
  createGroupDevotionalShare(data: InsertGroupDevotionalShare): Promise<GroupDevotionalShare>;
  getGroupDevotionalShares(groupId: number): Promise<(GroupDevotionalShare & { reactions: GroupDevotionalReaction[] })[]>;
  toggleGroupDevotionalReaction(data: InsertGroupDevotionalReaction): Promise<{ added: boolean }>;
  // Announcements
  createGroupAnnouncement(data: InsertGroupAnnouncement): Promise<GroupAnnouncement>;
  getGroupAnnouncements(groupId: number): Promise<GroupAnnouncement[]>;
  deleteGroupAnnouncement(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Helper to filter out soft-deleted devotionals
  private notDeleted() {
    return or(eq(devotionals.isDeleted, false), isNull(devotionals.isDeleted));
  }

  async getDevotionals(): Promise<Devotional[]> {
    return await db
      .select()
      .from(devotionals)
      .where(this.notDeleted())
      .orderBy(desc(devotionals.date));
  }

  async getDevotional(id: number): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(and(eq(devotionals.id, id), this.notDeleted()));
    return devotional;
  }

  async getDevotionalByDate(date: string): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(and(eq(devotionals.date, date), this.notDeleted()));
    return devotional;
  }

  async getLatestDevotional(): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(this.notDeleted())
      .orderBy(desc(devotionals.date))
      .limit(1);
    return devotional;
  }

  async createDevotional(insertDevotional: InsertDevotional): Promise<Devotional> {
    const [devotional] = await db
      .insert(devotionals)
      .values(insertDevotional)
      .returning();
    return devotional;
  }

  async updateDevotional(
    id: number,
    updates: UpdateDevotionalRequest,
  ): Promise<Devotional> {
    const [updated] = await db
      .update(devotionals)
      .set(updates)
      .where(eq(devotionals.id, id))
      .returning();
    return updated;
  }

  async upsertDevotional(insertDevotional: InsertDevotional): Promise<Devotional> {
    const [devotional] = await db
      .insert(devotionals)
      .values(insertDevotional)
      .onConflictDoUpdate({
        target: devotionals.date,
        set: {
          title: insertDevotional.title,
          scriptureReference: insertDevotional.scriptureReference,
          scriptureText: insertDevotional.scriptureText,
          content: insertDevotional.content,
          prayerPoints: insertDevotional.prayerPoints,
          faithDeclarations: insertDevotional.faithDeclarations,
          author: insertDevotional.author,
          isDeleted: false,
          deletedAt: null,
        },
      })
      .returning();
    return devotional;
  }

  async deleteDevotional(id: number): Promise<void> {
    await db
      .update(devotionals)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(devotionals.id, id));
  }

  // Admin-only method to restore a soft-deleted devotional
  async restoreDevotional(id: number): Promise<Devotional | undefined> {
    const [restored] = await db
      .update(devotionals)
      .set({ isDeleted: false, deletedAt: null })
      .where(eq(devotionals.id, id))
      .returning();
    return restored;
  }

  // Admin-only method to get deleted devotionals (for restoration)
  async getDeletedDevotionals(): Promise<Devotional[]> {
    return await db
      .select()
      .from(devotionals)
      .where(eq(devotionals.isDeleted, true))
      .orderBy(desc(devotionals.date));
  }

  // Prayer Requests
  async getPrayerRequests(): Promise<PrayerRequest[]> {
    return await db.select().from(prayerRequests).orderBy(desc(prayerRequests.createdAt));
  }

  async getPrayerRequest(id: number): Promise<PrayerRequest | undefined> {
    const [request] = await db
      .select()
      .from(prayerRequests)
      .where(eq(prayerRequests.id, id));
    return request;
  }

  async createPrayerRequest(request: InsertPrayerRequest): Promise<PrayerRequest> {
    const [created] = await db
      .insert(prayerRequests)
      .values(request)
      .returning();
    return created;
  }

  async markPrayerRequestRead(id: number): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ isRead: true })
      .where(eq(prayerRequests.id, id))
      .returning();
    return updated;
  }

  // Prayer Replies
  async getRepliesForRequest(requestId: number): Promise<PrayerReply[]> {
    return await db
      .select()
      .from(prayerReplies)
      .where(eq(prayerReplies.requestId, requestId))
      .orderBy(desc(prayerReplies.createdAt));
  }

  async createPrayerReply(reply: InsertPrayerReply): Promise<PrayerReply> {
    const [created] = await db
      .insert(prayerReplies)
      .values(reply)
      .returning();
    return created;
  }

  // Thread Messages
  async getThreadMessages(requestId: number): Promise<ThreadMessage[]> {
    return await db
      .select()
      .from(threadMessages)
      .where(eq(threadMessages.requestId, requestId))
      .orderBy(threadMessages.createdAt);
  }

  async createThreadMessage(message: InsertThreadMessage): Promise<ThreadMessage> {
    const [created] = await db
      .insert(threadMessages)
      .values(message)
      .returning();
    return created;
  }

  async markAdminMessagesRead(requestId: number): Promise<number> {
    const result = await db
      .update(threadMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(threadMessages.requestId, requestId),
          eq(threadMessages.senderType, "admin"),
          eq(threadMessages.isRead, false)
        )
      )
      .returning();
    return result.length;
  }

  async getPrayerRequestsByEmail(email: string): Promise<PrayerRequest[]> {
    return await db
      .select()
      .from(prayerRequests)
      .where(ilike(prayerRequests.email, email))
      .orderBy(desc(prayerRequests.createdAt));
  }

  async getPrayerRequestsByUid(uid: string): Promise<PrayerRequest[]> {
    return await db
      .select()
      .from(prayerRequests)
      .where(eq(prayerRequests.firebaseUid, uid))
      .orderBy(desc(prayerRequests.createdAt));
  }

  async linkPrayerToUid(id: number, uid: string): Promise<void> {
    await db
      .update(prayerRequests)
      .set({ firebaseUid: uid })
      .where(and(eq(prayerRequests.id, id), isNull(prayerRequests.firebaseUid)));
  }

  async markPrayerAnswered(id: number, uid: string, answerNote?: string): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ status: "answered", answeredAt: new Date(), answerNote: answerNote ?? null })
      .where(and(eq(prayerRequests.id, id), eq(prayerRequests.firebaseUid, uid)))
      .returning();
    return updated;
  }

  async withdrawPrayerRequest(id: number, uid: string): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ status: "closed" })
      .where(and(eq(prayerRequests.id, id), eq(prayerRequests.firebaseUid, uid), eq(prayerRequests.status, "new")))
      .returning();
    return updated;
  }

  async updatePrayerRequestByUser(id: number, uid: string, data: { subject?: string; message?: string }): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set(data)
      .where(and(eq(prayerRequests.id, id), eq(prayerRequests.firebaseUid, uid), eq(prayerRequests.status, "new")))
      .returning();
    return updated;
  }

  // Prayer Request Status
  async updatePrayerRequestStatus(id: number, status: string): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ status })
      .where(eq(prayerRequests.id, id))
      .returning();
    return updated;
  }

  async updatePrayerRequestCategory(id: number, category: string): Promise<PrayerRequest> {
    const [updated] = await db
      .update(prayerRequests)
      .set({ category })
      .where(eq(prayerRequests.id, id))
      .returning();
    return updated;
  }

  // Auto-Reply Templates
  async getAutoReplyTemplate(templateType: string): Promise<AutoReplyTemplate | undefined> {
    const [template] = await db
      .select()
      .from(autoReplyTemplates)
      .where(eq(autoReplyTemplates.templateType, templateType));
    return template;
  }

  async getAutoReplyTemplates(): Promise<AutoReplyTemplate[]> {
    return await db.select().from(autoReplyTemplates);
  }

  async upsertAutoReplyTemplate(template: InsertAutoReplyTemplate): Promise<AutoReplyTemplate> {
    const existing = await this.getAutoReplyTemplate(template.templateType);
    if (existing) {
      const [updated] = await db
        .update(autoReplyTemplates)
        .set({ ...template, updatedAt: new Date() })
        .where(eq(autoReplyTemplates.templateType, template.templateType))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(autoReplyTemplates)
      .values(template)
      .returning();
    return created;
  }

  // Prayer Attachments
  async getAttachmentsForRequest(requestId: number): Promise<PrayerAttachment[]> {
    return await db
      .select()
      .from(prayerAttachments)
      .where(eq(prayerAttachments.requestId, requestId))
      .orderBy(prayerAttachments.createdAt);
  }

  async createPrayerAttachment(attachment: InsertPrayerAttachment): Promise<PrayerAttachment> {
    const [created] = await db
      .insert(prayerAttachments)
      .values(attachment)
      .returning();
    return created;
  }

  // Support Tickets
  async getSupportTickets(): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db
      .insert(supportTickets)
      .values(ticket)
      .returning();
    return created;
  }

  // Contact Messages
  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db
      .insert(contactMessages)
      .values(message)
      .returning();
    return created;
  }

  // General Inquiries
  async getGeneralInquiries(): Promise<GeneralInquiry[]> {
    return await db.select().from(generalInquiries).orderBy(desc(generalInquiries.createdAt));
  }

  async createGeneralInquiry(inquiry: InsertGeneralInquiry): Promise<GeneralInquiry> {
    const [created] = await db
      .insert(generalInquiries)
      .values(inquiry)
      .returning();
    return created;
  }

  // Feedback
  async getFeedback(): Promise<FeedbackMessage[]> {
    return await db.select().from(feedbackMessages).orderBy(desc(feedbackMessages.createdAt));
  }

  async createFeedback(feedback: InsertFeedback): Promise<FeedbackMessage> {
    const [created] = await db
      .insert(feedbackMessages)
      .values(feedback)
      .returning();
    return created;
  }

  // Partnership
  async getPartnershipInquiries(): Promise<PartnershipInquiry[]> {
    return await db.select().from(partnershipInquiries).orderBy(desc(partnershipInquiries.createdAt));
  }

  async createPartnershipInquiry(inquiry: InsertPartnership): Promise<PartnershipInquiry> {
    const [created] = await db
      .insert(partnershipInquiries)
      .values(inquiry)
      .returning();
    return created;
  }

  // Bible Passages
  async getBiblePassage(reference: string, translation: BibleTranslation): Promise<BiblePassage | undefined> {
    const [passage] = await db
      .select()
      .from(biblePassages)
      .where(and(
        eq(biblePassages.reference, reference),
        eq(biblePassages.translation, translation)
      ));
    return passage;
  }

  async getBiblePassages(references: string[], translation: BibleTranslation): Promise<BiblePassage[]> {
    if (references.length === 0) return [];
    const results: BiblePassage[] = [];
    for (const ref of references) {
      const passage = await this.getBiblePassage(ref, translation);
      if (passage) results.push(passage);
    }
    return results;
  }

  async getAllBiblePassages(translation: BibleTranslation): Promise<BiblePassage[]> {
    return await db
      .select()
      .from(biblePassages)
      .where(eq(biblePassages.translation, translation))
      .orderBy(biblePassages.reference);
  }

  async createBiblePassage(passage: InsertBiblePassage): Promise<BiblePassage> {
    const [created] = await db
      .insert(biblePassages)
      .values(passage)
      .returning();
    return created;
  }

  async upsertBiblePassage(passage: InsertBiblePassage): Promise<BiblePassage> {
    const existing = await this.getBiblePassage(passage.reference, passage.translation as BibleTranslation);
    if (existing) {
      const [updated] = await db
        .update(biblePassages)
        .set({ content: passage.content })
        .where(eq(biblePassages.id, existing.id))
        .returning();
      return updated;
    }
    return this.createBiblePassage(passage);
  }

  // Sunday School
  async getSundaySchoolLessons(): Promise<SundaySchoolLesson[]> {
    return await db
      .select()
      .from(sundaySchoolLessons)
      .orderBy(desc(sundaySchoolLessons.date));
  }

  async getSundaySchoolLesson(id: number): Promise<SundaySchoolLesson | undefined> {
    const [lesson] = await db
      .select()
      .from(sundaySchoolLessons)
      .where(eq(sundaySchoolLessons.id, id));
    return lesson;
  }

  async createSundaySchoolLesson(lesson: InsertSundaySchoolLesson): Promise<SundaySchoolLesson> {
    const [created] = await db
      .insert(sundaySchoolLessons)
      .values(lesson)
      .returning();
    return created;
  }

  async updateSundaySchoolLesson(id: number, updates: Partial<InsertSundaySchoolLesson>): Promise<SundaySchoolLesson> {
    const [updated] = await db
      .update(sundaySchoolLessons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sundaySchoolLessons.id, id))
      .returning();
    return updated;
  }

  async deleteSundaySchoolLesson(id: number): Promise<void> {
    await db.delete(sundaySchoolLessons).where(eq(sundaySchoolLessons.id, id));
  }

  async getApprovedTestimonies(): Promise<Testimony[]> {
    return await db
      .select()
      .from(testimonies)
      .where(eq(testimonies.isApproved, true))
      .orderBy(desc(testimonies.createdAt));
  }

  async getAllTestimonies(): Promise<Testimony[]> {
    return await db
      .select()
      .from(testimonies)
      .where(or(eq(testimonies.isDraft, false), isNull(testimonies.isDraft)))
      .orderBy(desc(testimonies.createdAt));
  }

  async createTestimony(testimony: InsertTestimony): Promise<Testimony> {
    const [created] = await db
      .insert(testimonies)
      .values(testimony)
      .returning();
    return created;
  }

  async approveTestimony(id: number): Promise<Testimony> {
    const [updated] = await db
      .update(testimonies)
      .set({ isApproved: true })
      .where(eq(testimonies.id, id))
      .returning();
    return updated;
  }

  async rejectTestimony(id: number): Promise<Testimony> {
    const [updated] = await db
      .update(testimonies)
      .set({ isDraft: true, isApproved: false })
      .where(eq(testimonies.id, id))
      .returning();
    return updated;
  }

  async deleteTestimony(id: number): Promise<void> {
    await db.delete(testimonies).where(eq(testimonies.id, id));
  }

  async getUserTestimony(prayerRequestId: number, uid: string): Promise<Testimony | undefined> {
    const [t] = await db
      .select()
      .from(testimonies)
      .where(and(eq(testimonies.requestId, prayerRequestId), eq(testimonies.firebaseUid, uid)));
    return t;
  }

  async upsertUserTestimony(prayerRequestId: number, uid: string, data: { name?: string; message: string }): Promise<Testimony> {
    const existing = await this.getUserTestimony(prayerRequestId, uid);
    if (existing) {
      const [updated] = await db
        .update(testimonies)
        .set({ name: data.name ?? existing.name, message: data.message })
        .where(eq(testimonies.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(testimonies)
      .values({ requestId: prayerRequestId, firebaseUid: uid, name: data.name ?? null, message: data.message, isDraft: true })
      .returning();
    return created;
  }

  async submitTestimonyForReview(id: number, uid: string): Promise<Testimony> {
    const [updated] = await db
      .update(testimonies)
      .set({ isDraft: false })
      .where(and(eq(testimonies.id, id), eq(testimonies.firebaseUid, uid)))
      .returning();
    return updated;
  }

  async getFollowUpsForRequest(requestId: number): Promise<PrayerFollowUp[]> {
    return await db
      .select()
      .from(prayerFollowUps)
      .where(eq(prayerFollowUps.requestId, requestId))
      .orderBy(prayerFollowUps.sentAt);
  }

  async createFollowUp(requestId: number, dayNumber: number, message: string): Promise<PrayerFollowUp> {
    const [created] = await db
      .insert(prayerFollowUps)
      .values({ requestId, dayNumber, message })
      .returning();
    return created;
  }

  async getRequestsNeedingFollowUp(dayNumber: number): Promise<PrayerRequest[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dayNumber);
    cutoffDate.setHours(0, 0, 0, 0);

    const endDate = new Date(cutoffDate);
    endDate.setDate(endDate.getDate() + 1);

    const existingFollowUps = db
      .select({ requestId: prayerFollowUps.requestId })
      .from(prayerFollowUps)
      .where(eq(prayerFollowUps.dayNumber, dayNumber));

    return await db
      .select()
      .from(prayerRequests)
      .where(
        and(
          lte(prayerRequests.createdAt, endDate),
          sql`${prayerRequests.createdAt} >= ${cutoffDate}`,
          sql`${prayerRequests.id} NOT IN (${existingFollowUps})`
        )
      );
  }
  // Inbox methods
  async createInboxThread(thread: InsertInboxThread, firstMessage: string): Promise<InboxThread> {
    const [created] = await db
      .insert(inboxThreads)
      .values({ ...thread, hasUnreadAdmin: true })
      .returning();
    await db
      .insert(inboxMessages)
      .values({ threadId: created.id, senderType: "user", message: firstMessage });
    return created;
  }

  async getInboxThreadsByEmail(email: string): Promise<InboxThread[]> {
    return await db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.userEmail, email.toLowerCase()))
      .orderBy(desc(inboxThreads.updatedAt));
  }

  async getAllInboxThreads(filters?: { category?: string; status?: string }): Promise<InboxThread[]> {
    const conditions = [];
    if (filters?.category) conditions.push(eq(inboxThreads.category, filters.category));
    if (filters?.status) conditions.push(eq(inboxThreads.status, filters.status));
    return await db
      .select()
      .from(inboxThreads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(inboxThreads.updatedAt));
  }

  async getInboxThread(id: number): Promise<InboxThread | undefined> {
    const [thread] = await db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.id, id));
    return thread;
  }

  async getInboxMessages(threadId: number, viewerType: "user" | "admin"): Promise<InboxMessage[]> {
    const deletedCol = viewerType === "user" ? inboxMessages.deletedByUser : inboxMessages.deletedByAdmin;
    return await db
      .select()
      .from(inboxMessages)
      .where(and(eq(inboxMessages.threadId, threadId), eq(deletedCol, false)))
      .orderBy(inboxMessages.createdAt);
  }

  async createInboxMessage(message: InsertInboxMessage): Promise<InboxMessage> {
    const [created] = await db
      .insert(inboxMessages)
      .values(message)
      .returning();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (message.senderType === "admin" || message.senderType === "ai") {
      updateData.hasUnreadUser = true;
      updateData.status = "replied";
    } else {
      updateData.hasUnreadAdmin = true;
    }
    await db
      .update(inboxThreads)
      .set(updateData)
      .where(eq(inboxThreads.id, message.threadId));
    return created;
  }

  async updateInboxThreadStatus(id: number, status: string): Promise<InboxThread> {
    const [updated] = await db
      .update(inboxThreads)
      .set({ status, updatedAt: new Date() })
      .where(eq(inboxThreads.id, id))
      .returning();
    return updated;
  }

  async markInboxThreadRead(id: number, readerType: "user" | "admin"): Promise<void> {
    const field = readerType === "user" ? { hasUnreadUser: false } : { hasUnreadAdmin: false };
    await db
      .update(inboxThreads)
      .set(field)
      .where(eq(inboxThreads.id, id));
  }

  async deleteInboxMessage(id: number, viewerType: "user" | "admin"): Promise<void> {
    const field = viewerType === "user" ? { deletedByUser: true } : { deletedByAdmin: true };
    await db
      .update(inboxMessages)
      .set(field)
      .where(eq(inboxMessages.id, id));
  }

  async getLastInboxMessage(threadId: number): Promise<InboxMessage | undefined> {
    const [msg] = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.threadId, threadId))
      .orderBy(desc(inboxMessages.createdAt))
      .limit(1);
    return msg;
  }

  async cleanupOldInboxMessages(daysOld: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const result = await db
      .delete(inboxMessages)
      .where(lte(inboxMessages.createdAt, cutoff))
      .returning();
    return result.length;
  }

  // Songs — Song of the Week
  async getFeaturedSong(): Promise<Song | undefined> {
    const today = new Date().toISOString().split("T")[0];
    // Try to find a song featured for today's date range first
    const [dated] = await db
      .select()
      .from(songs)
      .where(
        and(
          eq(songs.isActive, true),
          sql`${songs.featuredWeekStart} <= ${today}`,
          sql`${songs.featuredWeekEnd} >= ${today}`
        )
      )
      .orderBy(desc(songs.featuredWeekStart))
      .limit(1);
    if (dated) return dated;
    // Fall back to the most recently created active song
    const [fallback] = await db
      .select()
      .from(songs)
      .where(eq(songs.isActive, true))
      .orderBy(desc(songs.createdAt))
      .limit(1);
    return fallback;
  }

  async getPublicSongs(): Promise<Song[]> {
    return db.select().from(songs)
      .where(eq(songs.isActive, true))
      .orderBy(desc(songs.createdAt));
  }

  async getSongs(): Promise<Song[]> {
    return db.select().from(songs).orderBy(desc(songs.createdAt));
  }

  async getSong(id: number): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song;
  }

  async getSongBySlug(slug: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.slug, slug));
    return song;
  }

  async deleteSong(id: number): Promise<void> {
    await db.delete(songs).where(eq(songs.id, id));
  }

  async createSong(song: InsertSong): Promise<Song> {
    const [created] = await db.insert(songs).values(song).returning();
    return created;
  }

  async updateSong(id: number, updates: Partial<InsertSong>): Promise<Song> {
    const [updated] = await db
      .update(songs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(songs.id, id))
      .returning();
    return updated;
  }

  // ── Song Collections ────────────────────────────────────────────────────────

  async getSongCollections(): Promise<SongCollection[]> {
    return db.select().from(songCollections)
      .orderBy(asc(songCollections.displayOrder), desc(songCollections.createdAt));
  }

  async getPublicSongCollections(): Promise<(SongCollection & { songs: Song[] })[]> {
    const cols = await db.select().from(songCollections)
      .where(eq(songCollections.isPublished, true))
      .orderBy(asc(songCollections.displayOrder), desc(songCollections.createdAt));
    const result: (SongCollection & { songs: Song[] })[] = [];
    for (const col of cols) {
      const items = await db.select({ song: songs }).from(songCollectionItems)
        .innerJoin(songs, eq(songCollectionItems.songId, songs.id))
        .where(and(eq(songCollectionItems.collectionId, col.id), eq(songs.isActive, true)))
        .orderBy(asc(songCollectionItems.displayOrder));
      result.push({ ...col, songs: items.map(i => i.song) });
    }
    return result;
  }

  async createSongCollection(data: InsertSongCollection): Promise<SongCollection> {
    const [created] = await db.insert(songCollections).values(data).returning();
    return created;
  }

  async updateSongCollection(id: number, data: Partial<InsertSongCollection>): Promise<SongCollection> {
    const [updated] = await db.update(songCollections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(songCollections.id, id))
      .returning();
    return updated;
  }

  async deleteSongCollection(id: number): Promise<void> {
    await db.delete(songCollections).where(eq(songCollections.id, id));
  }

  async addSongToCollection(collectionId: number, songId: number, displayOrder = 0): Promise<void> {
    await db.insert(songCollectionItems)
      .values({ collectionId, songId, displayOrder })
      .onConflictDoNothing();
  }

  async removeSongFromCollection(collectionId: number, songId: number): Promise<void> {
    await db.delete(songCollectionItems).where(
      and(eq(songCollectionItems.collectionId, collectionId), eq(songCollectionItems.songId, songId))
    );
  }

  async getCollectionSongIds(collectionId: number): Promise<number[]> {
    const items = await db.select({ songId: songCollectionItems.songId })
      .from(songCollectionItems)
      .where(eq(songCollectionItems.collectionId, collectionId))
      .orderBy(asc(songCollectionItems.displayOrder));
    return items.map(i => i.songId);
  }

  // ── Song Analytics ──────────────────────────────────────────────────────────

  async recordSongEvent(songId: number, eventType: string, userId?: string, sessionId?: string): Promise<void> {
    await db.insert(songEngagementEvents).values({
      songId, eventType, userId: userId ?? null, sessionId: sessionId ?? null,
    });
  }

  async getSongStats(songId: number): Promise<{ plays: number; shares: number; audioDownloads: number; videoDownloads: number; playsLast7: number; playsLast30: number }> {
    const now = new Date();
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rows = await db.execute(sql`
      SELECT event_type,
             COUNT(*)::int AS total,
             SUM(CASE WHEN created_at >= ${last7} THEN 1 ELSE 0 END)::int AS last7,
             SUM(CASE WHEN created_at >= ${last30} THEN 1 ELSE 0 END)::int AS last30
      FROM song_engagement_events
      WHERE song_id = ${songId}
      GROUP BY event_type
    `);
    const stats = { plays: 0, shares: 0, audioDownloads: 0, videoDownloads: 0, playsLast7: 0, playsLast30: 0 };
    for (const row of rows.rows as any[]) {
      if (row.event_type === "play") { stats.plays = row.total ?? 0; stats.playsLast7 = row.last7 ?? 0; stats.playsLast30 = row.last30 ?? 0; }
      else if (row.event_type === "share") stats.shares = row.total ?? 0;
      else if (row.event_type === "audio_download") stats.audioDownloads = row.total ?? 0;
      else if (row.event_type === "video_download") stats.videoDownloads = row.total ?? 0;
    }
    return stats;
  }

  async checkRecentPlay(songId: number, sessionId: string, minutesBack = 30): Promise<boolean> {
    const since = new Date(Date.now() - minutesBack * 60 * 1000);
    const rows = await db.select().from(songEngagementEvents).where(
      and(
        eq(songEngagementEvents.songId, songId),
        eq(songEngagementEvents.eventType, "play"),
        eq(songEngagementEvents.sessionId, sessionId),
        sql`${songEngagementEvents.createdAt} >= ${since}`
      )
    ).limit(1);
    return rows.length > 0;
  }

  async getSongTestimonies(songId?: number): Promise<SongTestimony[]> {
    if (songId !== undefined) {
      return db
        .select()
        .from(songTestimonies)
        .where(eq(songTestimonies.songId, songId))
        .orderBy(desc(songTestimonies.createdAt));
    }
    return db.select().from(songTestimonies).orderBy(desc(songTestimonies.createdAt));
  }

  async createSongTestimony(testimony: InsertSongTestimony): Promise<SongTestimony> {
    const [created] = await db.insert(songTestimonies).values(testimony).returning();
    return created;
  }

  async updateSongTestimony(id: number, data: Partial<SongTestimony>): Promise<SongTestimony> {
    const [updated] = await db
      .update(songTestimonies)
      .set(data)
      .where(eq(songTestimonies.id, id))
      .returning();
    return updated;
  }

  async deleteSongTestimony(id: number): Promise<void> {
    await db.delete(songTestimonies).where(eq(songTestimonies.id, id));
  }

  async getGivingMethods(activeOnly = false): Promise<GivingMethod[]> {
    if (activeOnly) {
      return db
        .select()
        .from(givingMethods)
        .where(eq(givingMethods.isActive, true))
        .orderBy(givingMethods.displayOrder, givingMethods.id);
    }
    return db.select().from(givingMethods).orderBy(givingMethods.displayOrder, givingMethods.id);
  }

  async createGivingMethod(method: InsertGivingMethod): Promise<GivingMethod> {
    const [created] = await db.insert(givingMethods).values(method).returning();
    return created;
  }

  async updateGivingMethod(id: number, data: Partial<InsertGivingMethod>): Promise<GivingMethod | undefined> {
    const [updated] = await db
      .update(givingMethods)
      .set(data)
      .where(eq(givingMethods.id, id))
      .returning();
    return updated;
  }

  async deleteGivingMethod(id: number): Promise<void> {
    await db.delete(givingMethods).where(eq(givingMethods.id, id));
  }

  // ── User Library ──────────────────────────────────────────────────────────

  async getUserSavedSongs(uid: string): Promise<(UserSavedSong & { song: Song })[]> {
    const rows = await db
      .select({ saved: userSavedSongs, song: songs })
      .from(userSavedSongs)
      .innerJoin(songs, eq(userSavedSongs.songId, songs.id))
      .where(and(eq(userSavedSongs.firebaseUid, uid), eq(songs.isActive, true)))
      .orderBy(desc(userSavedSongs.savedAt));
    return rows.map((r) => ({ ...r.saved, song: r.song }));
  }

  async saveSong(uid: string, songId: number): Promise<UserSavedSong> {
    const [row] = await db
      .insert(userSavedSongs)
      .values({ firebaseUid: uid, songId })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      const [existing] = await db
        .select()
        .from(userSavedSongs)
        .where(and(eq(userSavedSongs.firebaseUid, uid), eq(userSavedSongs.songId, songId)));
      return existing;
    }
    return row;
  }

  async unsaveSong(uid: string, songId: number): Promise<void> {
    await db
      .delete(userSavedSongs)
      .where(and(eq(userSavedSongs.firebaseUid, uid), eq(userSavedSongs.songId, songId)));
  }

  async isSongSaved(uid: string, songId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: userSavedSongs.id })
      .from(userSavedSongs)
      .where(and(eq(userSavedSongs.firebaseUid, uid), eq(userSavedSongs.songId, songId)));
    return !!row;
  }

  async getUserFavoriteSongs(uid: string): Promise<(UserFavoriteSong & { song: Song })[]> {
    const rows = await db
      .select({ fav: userFavoriteSongs, song: songs })
      .from(userFavoriteSongs)
      .innerJoin(songs, eq(userFavoriteSongs.songId, songs.id))
      .where(and(eq(userFavoriteSongs.firebaseUid, uid), eq(songs.isActive, true)))
      .orderBy(desc(userFavoriteSongs.createdAt));
    return rows.map((r) => ({ ...r.fav, song: r.song }));
  }

  async favoriteSong(uid: string, songId: number): Promise<UserFavoriteSong> {
    const [row] = await db
      .insert(userFavoriteSongs)
      .values({ firebaseUid: uid, songId })
      .onConflictDoNothing()
      .returning();
    if (!row) {
      const [existing] = await db
        .select()
        .from(userFavoriteSongs)
        .where(and(eq(userFavoriteSongs.firebaseUid, uid), eq(userFavoriteSongs.songId, songId)));
      return existing;
    }
    return row;
  }

  async unfavoriteSong(uid: string, songId: number): Promise<void> {
    await db
      .delete(userFavoriteSongs)
      .where(and(eq(userFavoriteSongs.firebaseUid, uid), eq(userFavoriteSongs.songId, songId)));
  }

  async isSongFavorited(uid: string, songId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: userFavoriteSongs.id })
      .from(userFavoriteSongs)
      .where(and(eq(userFavoriteSongs.firebaseUid, uid), eq(userFavoriteSongs.songId, songId)));
    return !!row;
  }

  async mergeLocalFavorites(uid: string, songIds: number[]): Promise<void> {
    if (!songIds.length) return;
    const validSongs = await db
      .select({ id: songs.id })
      .from(songs)
      .where(and(eq(songs.isActive, true), sql`${songs.id} = ANY(${songIds})`));
    const validIds = validSongs.map((s) => s.id);
    if (!validIds.length) return;
    await db
      .insert(userFavoriteSongs)
      .values(validIds.map((songId) => ({ firebaseUid: uid, songId })))
      .onConflictDoNothing();
  }

  async getUserDownloadHistory(uid: string): Promise<(UserDownloadRecord & { song: Song | null })[]> {
    const rows = await db
      .select({ dl: userDownloadHistory, song: songs })
      .from(userDownloadHistory)
      .leftJoin(songs, eq(userDownloadHistory.songId, songs.id))
      .where(eq(userDownloadHistory.firebaseUid, uid))
      .orderBy(desc(userDownloadHistory.downloadedAt))
      .limit(100);
    return rows.map((r) => ({ ...r.dl, song: r.song }));
  }

  async recordDownload(uid: string, songId: number): Promise<UserDownloadRecord> {
    const [row] = await db
      .insert(userDownloadHistory)
      .values({ firebaseUid: uid, songId })
      .returning();
    return row;
  }

  async getUserPlaybackHistory(uid: string): Promise<(UserPlaybackHistory & { song: Song | null })[]> {
    const rows = await db
      .select({ history: userPlaybackHistory, song: songs })
      .from(userPlaybackHistory)
      .leftJoin(songs, eq(userPlaybackHistory.songId, songs.id))
      .where(eq(userPlaybackHistory.firebaseUid, uid))
      .orderBy(desc(userPlaybackHistory.lastPlayedAt))
      .limit(20);
    return rows.map((r) => ({ ...r.history, song: r.song }));
  }

  async upsertPlaybackPosition(uid: string, songId: number, lastPosition: number, durationSecs: number, progressPercent: number): Promise<void> {
    await db
      .insert(userPlaybackHistory)
      .values({ firebaseUid: uid, songId, lastPosition, durationSecs, progressPercent, lastPlayedAt: new Date() })
      .onConflictDoUpdate({
        target: [userPlaybackHistory.firebaseUid, userPlaybackHistory.songId],
        set: { lastPosition, durationSecs, progressPercent, lastPlayedAt: new Date() },
      });
  }

  async getUserMusicSettings(uid: string): Promise<UserMusicSettings | null> {
    const [row] = await db
      .select()
      .from(userMusicSettings)
      .where(eq(userMusicSettings.firebaseUid, uid));
    return row ?? null;
  }

  async upsertUserMusicSettings(uid: string, settings: Partial<Pick<UserMusicSettings, "autoplayNext" | "rememberPosition" | "defaultSpeed" | "repeatMode" | "shuffle">>): Promise<UserMusicSettings> {
    const [row] = await db
      .insert(userMusicSettings)
      .values({
        firebaseUid: uid,
        autoplayNext: settings.autoplayNext ?? false,
        rememberPosition: settings.rememberPosition ?? true,
        defaultSpeed: settings.defaultSpeed ?? 1,
        repeatMode: settings.repeatMode ?? "none",
        shuffle: settings.shuffle ?? false,
      })
      .onConflictDoUpdate({
        target: userMusicSettings.firebaseUid,
        set: {
          ...(settings.autoplayNext !== undefined && { autoplayNext: settings.autoplayNext }),
          ...(settings.rememberPosition !== undefined && { rememberPosition: settings.rememberPosition }),
          ...(settings.defaultSpeed !== undefined && { defaultSpeed: settings.defaultSpeed }),
          ...(settings.repeatMode !== undefined && { repeatMode: settings.repeatMode }),
          ...(settings.shuffle !== undefined && { shuffle: settings.shuffle }),
        },
      })
      .returning();
    return row;
  }

  // ── Phase F: Devotional Account Sync ────────────────────────────────────────

  async getSavedDevotionals(uid: string): Promise<(UserSavedDevotional & { devotional: Devotional })[]> {
    const rows = await db
      .select({ saved: userSavedDevotionals, devotional: devotionals })
      .from(userSavedDevotionals)
      .innerJoin(devotionals, eq(userSavedDevotionals.devotionalId, devotionals.id))
      .where(and(eq(userSavedDevotionals.firebaseUid, uid), or(eq(devotionals.isDeleted, false), isNull(devotionals.isDeleted))))
      .orderBy(desc(userSavedDevotionals.savedAt));
    return rows.map(r => ({ ...r.saved, devotional: r.devotional }));
  }

  async saveDevotional(uid: string, devotionalId: number): Promise<void> {
    await db.insert(userSavedDevotionals).values({ firebaseUid: uid, devotionalId }).onConflictDoNothing();
  }

  async unsaveDevotional(uid: string, devotionalId: number): Promise<void> {
    await db.delete(userSavedDevotionals).where(and(eq(userSavedDevotionals.firebaseUid, uid), eq(userSavedDevotionals.devotionalId, devotionalId)));
  }

  async isDevotionalSaved(uid: string, devotionalId: number): Promise<boolean> {
    const [row] = await db.select({ id: userSavedDevotionals.id }).from(userSavedDevotionals)
      .where(and(eq(userSavedDevotionals.firebaseUid, uid), eq(userSavedDevotionals.devotionalId, devotionalId)));
    return !!row;
  }

  async mergeLocalDevotionalSaves(uid: string, devotionalIds: number[]): Promise<void> {
    if (!devotionalIds.length) return;
    const values = devotionalIds.map(devotionalId => ({ firebaseUid: uid, devotionalId }));
    await db.insert(userSavedDevotionals).values(values).onConflictDoNothing();
  }

  async recordDevotionalRead(uid: string, devotionalId: number): Promise<void> {
    await db.insert(userDevotionalHistory)
      .values({ firebaseUid: uid, devotionalId, firstOpenedAt: new Date(), lastOpenedAt: new Date() })
      .onConflictDoUpdate({
        target: [userDevotionalHistory.firebaseUid, userDevotionalHistory.devotionalId],
        set: { lastOpenedAt: new Date() },
      });
  }

  async getDevotionalHistory(uid: string): Promise<(UserDevotionalHistory & { devotional: Devotional })[]> {
    const rows = await db
      .select({ history: userDevotionalHistory, devotional: devotionals })
      .from(userDevotionalHistory)
      .innerJoin(devotionals, eq(userDevotionalHistory.devotionalId, devotionals.id))
      .where(and(eq(userDevotionalHistory.firebaseUid, uid), or(eq(devotionals.isDeleted, false), isNull(devotionals.isDeleted))))
      .orderBy(desc(userDevotionalHistory.lastOpenedAt))
      .limit(20);
    return rows.map(r => ({ ...r.history, devotional: r.devotional }));
  }

  async getDevotionalStreak(uid: string): Promise<UserDevotionalStreak | null> {
    const [row] = await db.select().from(userDevotionalStreak).where(eq(userDevotionalStreak.firebaseUid, uid));
    return row ?? null;
  }

  async upsertDevotionalStreak(uid: string, currentStreak: number, longestStreak: number, lastReadDate: string): Promise<UserDevotionalStreak> {
    const [row] = await db.insert(userDevotionalStreak)
      .values({ firebaseUid: uid, currentStreak, longestStreak, lastReadDate })
      .onConflictDoUpdate({
        target: userDevotionalStreak.firebaseUid,
        set: { currentStreak, longestStreak, lastReadDate },
      })
      .returning();
    return row;
  }

  async getDevotionalNote(uid: string, devotionalId: number): Promise<UserDevotionalNote | null> {
    const [row] = await db.select().from(userDevotionalNotes)
      .where(and(eq(userDevotionalNotes.firebaseUid, uid), eq(userDevotionalNotes.devotionalId, devotionalId)));
    return row ?? null;
  }

  async upsertDevotionalNote(uid: string, devotionalId: number, noteText: string): Promise<void> {
    await db.insert(userDevotionalNotes)
      .values({ firebaseUid: uid, devotionalId, noteText, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [userDevotionalNotes.firebaseUid, userDevotionalNotes.devotionalId],
        set: { noteText, updatedAt: new Date() },
      });
  }

  async deleteDevotionalNote(uid: string, devotionalId: number): Promise<void> {
    await db.delete(userDevotionalNotes).where(and(eq(userDevotionalNotes.firebaseUid, uid), eq(userDevotionalNotes.devotionalId, devotionalId)));
  }

  async createDonationConfirmation(data: InsertDonationConfirmation): Promise<DonationConfirmation> {
    const [row] = await db.insert(donationConfirmations).values(data).returning();
    return row;
  }

  async getDonationConfirmations(): Promise<DonationConfirmation[]> {
    return await db.select().from(donationConfirmations).orderBy(desc(donationConfirmations.createdAt));
  }

  async updateDonationConfirmationThankYouStatus(id: number, status: string): Promise<DonationConfirmation> {
    const [row] = await db
      .update(donationConfirmations)
      .set({ thankYouStatus: status, thankYouSentAt: status === "sent" ? new Date() : null })
      .where(eq(donationConfirmations.id, id))
      .returning();
    return row;
  }

  // ── Church Mode — Phase 2A ──────────────────────────────────────────────────

  async createChurch(data: InsertChurch): Promise<Church> {
    const [row] = await db.insert(churches).values(data).returning();
    return row;
  }

  async getChurch(id: number): Promise<Church | undefined> {
    const [row] = await db.select().from(churches).where(eq(churches.id, id));
    return row;
  }

  async getChurchBySlug(slug: string): Promise<Church | undefined> {
    const [row] = await db.select().from(churches).where(eq(churches.slug, slug));
    return row;
  }

  async getChurchesByOwner(ownerId: string): Promise<Church[]> {
    return await db.select().from(churches).where(eq(churches.ownerId, ownerId)).orderBy(desc(churches.createdAt));
  }

  async updateChurch(id: number, data: Partial<InsertChurch>): Promise<Church> {
    const [row] = await db.update(churches).set(data).where(eq(churches.id, id)).returning();
    return row;
  }

  async deleteChurch(id: number): Promise<void> {
    await db.delete(churches).where(eq(churches.id, id));
  }

  async addChurchMember(data: InsertChurchMember): Promise<ChurchMember> {
    const [row] = await db.insert(churchMembers).values(data)
      .onConflictDoUpdate({
        target: [churchMembers.churchId, churchMembers.firebaseUid],
        set: { role: data.role, status: data.status ?? "active" },
      })
      .returning();
    return row;
  }

  async getChurchMembers(churchId: number): Promise<ChurchMember[]> {
    return await db.select().from(churchMembers)
      .where(eq(churchMembers.churchId, churchId))
      .orderBy(churchMembers.joinedAt);
  }

  async getChurchMember(churchId: number, firebaseUid: string): Promise<ChurchMember | undefined> {
    const [row] = await db.select().from(churchMembers)
      .where(and(eq(churchMembers.churchId, churchId), eq(churchMembers.firebaseUid, firebaseUid)));
    return row;
  }

  async getChurchMemberById(churchId: number, memberId: number): Promise<ChurchMember | undefined> {
    const [row] = await db.select().from(churchMembers)
      .where(and(eq(churchMembers.churchId, churchId), eq(churchMembers.id, memberId)));
    return row;
  }

  async getUserChurches(firebaseUid: string): Promise<(ChurchMember & { church: Church })[]> {
    const rows = await db
      .select({ member: churchMembers, church: churches })
      .from(churchMembers)
      .innerJoin(churches, eq(churchMembers.churchId, churches.id))
      .where(and(eq(churchMembers.firebaseUid, firebaseUid), eq(churchMembers.status, "active")))
      .orderBy(desc(churchMembers.joinedAt));
    return rows.map(r => ({ ...r.member, church: r.church }));
  }

  async updateChurchMemberRole(id: number, role: string): Promise<ChurchMember> {
    const [row] = await db.update(churchMembers).set({ role }).where(eq(churchMembers.id, id)).returning();
    return row;
  }

  async updateChurchMemberStatus(id: number, status: string): Promise<ChurchMember> {
    const [row] = await db.update(churchMembers).set({ status }).where(eq(churchMembers.id, id)).returning();
    return row;
  }

  async removeChurchMember(churchId: number, firebaseUid: string): Promise<void> {
    await db.delete(churchMembers).where(and(eq(churchMembers.churchId, churchId), eq(churchMembers.firebaseUid, firebaseUid)));
  }

  async createChurchInvitation(data: InsertChurchInvitation): Promise<ChurchInvitation> {
    const [row] = await db.insert(churchInvitations).values(data).returning();
    return row;
  }

  async getChurchInvitation(inviteCode: string): Promise<ChurchInvitation | undefined> {
    const [row] = await db.select().from(churchInvitations).where(eq(churchInvitations.inviteCode, inviteCode));
    return row;
  }

  async getChurchInvitations(churchId: number): Promise<ChurchInvitation[]> {
    return await db.select().from(churchInvitations)
      .where(eq(churchInvitations.churchId, churchId))
      .orderBy(desc(churchInvitations.createdAt));
  }

  async useChurchInvitation(inviteCode: string): Promise<ChurchInvitation> {
    const [row] = await db.update(churchInvitations)
      .set({ usedCount: sql`${churchInvitations.usedCount} + 1` })
      .where(eq(churchInvitations.inviteCode, inviteCode))
      .returning();
    return row;
  }

  async approveChurchInvitationUse(inviteCode: string): Promise<ChurchInvitation> {
    const [row] = await db.update(churchInvitations)
      .set({ approvedUses: sql`${churchInvitations.approvedUses} + 1` })
      .where(eq(churchInvitations.inviteCode, inviteCode))
      .returning();
    return row;
  }

  async deactivateChurchInvitation(id: number): Promise<void> {
    await db.update(churchInvitations).set({ isActive: false }).where(eq(churchInvitations.id, id));
  }

  async deleteChurchInvitation(id: number): Promise<void> {
    await db.delete(churchInvitations).where(eq(churchInvitations.id, id));
  }

  // ── Church Member Profiles ──────────────────────────────────────────────────
  async upsertChurchMemberProfile(data: Partial<ChurchMemberProfile> & { churchId: number; firebaseUid: string }): Promise<ChurchMemberProfile> {
    const existing = await this.getChurchMemberProfile(data.churchId, data.firebaseUid);
    if (existing) {
      const [row] = await db.update(churchMemberProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(churchMemberProfiles.churchId, data.churchId), eq(churchMemberProfiles.firebaseUid, data.firebaseUid)))
        .returning();
      return row;
    }
    const [row] = await db.insert(churchMemberProfiles).values({ ...data, updatedAt: new Date() } as any).returning();
    return row;
  }

  async getChurchMemberProfile(churchId: number, firebaseUid: string): Promise<ChurchMemberProfile | undefined> {
    const [row] = await db.select().from(churchMemberProfiles)
      .where(and(eq(churchMemberProfiles.churchId, churchId), eq(churchMemberProfiles.firebaseUid, firebaseUid)));
    return row;
  }

  async getChurchMemberProfilesByChurchId(churchId: number): Promise<ChurchMemberProfile[]> {
    return db.select().from(churchMemberProfiles).where(eq(churchMemberProfiles.churchId, churchId));
  }

  // ── Church Messaging ─────────────────────────────────────────────────────────
  async createChurchConversation(data: InsertChurchConversation): Promise<ChurchConversation> {
    const [row] = await db.insert(churchConversations).values(data).returning();
    return row;
  }

  async getChurchConversations(churchId: number, firebaseUid: string, isLeader: boolean): Promise<ChurchConversation[]> {
    if (isLeader) {
      // Leaders see all conversations for this church
      return await db.select().from(churchConversations)
        .where(eq(churchConversations.churchId, churchId))
        .orderBy(desc(churchConversations.updatedAt));
    }
    // Members see only conversations they participate in
    const participantRows = await db.select({ conversationId: churchConversationParticipants.conversationId })
      .from(churchConversationParticipants)
      .where(eq(churchConversationParticipants.firebaseUid, firebaseUid));
    const ids = participantRows.map(r => r.conversationId);
    if (!ids.length) return [];
    return await db.select().from(churchConversations)
      .where(and(eq(churchConversations.churchId, churchId), sql`${churchConversations.id} = ANY(${ids})`))
      .orderBy(desc(churchConversations.updatedAt));
  }

  async getChurchConversation(id: number): Promise<ChurchConversation | undefined> {
    const [row] = await db.select().from(churchConversations).where(eq(churchConversations.id, id));
    return row;
  }

  async updateChurchConversation(id: number, data: Partial<ChurchConversation>): Promise<ChurchConversation> {
    const [row] = await db.update(churchConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(churchConversations.id, id))
      .returning();
    return row;
  }

  async addConversationParticipant(data: InsertChurchConversationParticipant): Promise<ChurchConversationParticipant> {
    const [row] = await db.insert(churchConversationParticipants)
      .values(data)
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async getConversationParticipants(conversationId: number): Promise<ChurchConversationParticipant[]> {
    return await db.select().from(churchConversationParticipants)
      .where(eq(churchConversationParticipants.conversationId, conversationId))
      .orderBy(churchConversationParticipants.addedAt);
  }

  async isConversationParticipant(conversationId: number, firebaseUid: string): Promise<boolean> {
    const [row] = await db.select({ id: churchConversationParticipants.id })
      .from(churchConversationParticipants)
      .where(and(
        eq(churchConversationParticipants.conversationId, conversationId),
        eq(churchConversationParticipants.firebaseUid, firebaseUid)
      ));
    return !!row;
  }

  async createChurchMessage(data: InsertChurchMessage): Promise<ChurchMessage> {
    const [row] = await db.insert(churchMessages).values(data).returning();
    // Update conversation updatedAt
    await db.update(churchConversations).set({ updatedAt: new Date() }).where(eq(churchConversations.id, data.conversationId));
    return row;
  }

  async getChurchMessages(conversationId: number, limit = 50, offset = 0): Promise<ChurchMessage[]> {
    return await db.select().from(churchMessages)
      .where(and(eq(churchMessages.conversationId, conversationId), eq(churchMessages.deletedBySender, false)))
      .orderBy(churchMessages.createdAt)
      .limit(limit)
      .offset(offset);
  }

  async markMessagesRead(conversationId: number, firebaseUid: string): Promise<void> {
    const msgs = await db.select({ id: churchMessages.id }).from(churchMessages)
      .where(eq(churchMessages.conversationId, conversationId));
    for (const m of msgs) {
      await db.insert(churchMessageReads)
        .values({ messageId: m.id, firebaseUid })
        .onConflictDoNothing();
    }
  }

  async getUnreadMessageCount(churchId: number, firebaseUid: string): Promise<number> {
    const participantRows = await db.select({ conversationId: churchConversationParticipants.conversationId })
      .from(churchConversationParticipants)
      .where(and(
        eq(churchConversationParticipants.firebaseUid, firebaseUid),
        eq(churchConversationParticipants.churchId, churchId)
      ));
    if (!participantRows.length) return 0;
    const convIds = participantRows.map(r => r.conversationId);
    const allMsgs = await db.select({ id: churchMessages.id })
      .from(churchMessages)
      .where(sql`${churchMessages.conversationId} = ANY(${convIds})`);
    if (!allMsgs.length) return 0;
    const msgIds = allMsgs.map(m => m.id);
    const readRows = await db.select({ messageId: churchMessageReads.messageId })
      .from(churchMessageReads)
      .where(and(
        eq(churchMessageReads.firebaseUid, firebaseUid),
        sql`${churchMessageReads.messageId} = ANY(${msgIds})`
      ));
    const readSet = new Set(readRows.map(r => r.messageId));
    return allMsgs.filter(m => !readSet.has(m.id)).length;
  }

  // ── Church Sermons ──────────────────────────────────────────────────────────
  async createChurchSermon(data: InsertChurchSermon): Promise<ChurchSermon> {
    const [row] = await db.insert(churchSermons).values(data).returning();
    return row;
  }
  async getChurchSermons(churchId: number): Promise<ChurchSermon[]> {
    return await db.select().from(churchSermons)
      .where(and(eq(churchSermons.churchId, churchId), eq(churchSermons.isPublished, true)))
      .orderBy(desc(churchSermons.sermonDate));
  }
  async updateChurchSermon(id: number, data: Partial<InsertChurchSermon>): Promise<ChurchSermon> {
    const [row] = await db.update(churchSermons).set(data).where(eq(churchSermons.id, id)).returning();
    return row;
  }
  async deleteChurchSermon(id: number): Promise<void> {
    await db.delete(churchSermons).where(eq(churchSermons.id, id));
  }

  // ── Church Announcements ────────────────────────────────────────────────────
  async createChurchAnnouncement(data: InsertChurchAnnouncement): Promise<ChurchAnnouncement> {
    const [row] = await db.insert(churchAnnouncements).values(data).returning();
    return row;
  }
  async getChurchAnnouncements(churchId: number): Promise<ChurchAnnouncement[]> {
    return await db.select().from(churchAnnouncements)
      .where(eq(churchAnnouncements.churchId, churchId))
      .orderBy(desc(churchAnnouncements.isPinned), desc(churchAnnouncements.createdAt));
  }
  async updateChurchAnnouncement(id: number, data: Partial<InsertChurchAnnouncement>): Promise<ChurchAnnouncement> {
    const [row] = await db.update(churchAnnouncements).set(data).where(eq(churchAnnouncements.id, id)).returning();
    return row;
  }
  async deleteChurchAnnouncement(id: number): Promise<void> {
    await db.delete(churchAnnouncements).where(eq(churchAnnouncements.id, id));
  }

  // ── Church Groups ───────────────────────────────────────────────────────────
  async createChurchGroup(data: InsertChurchGroup): Promise<ChurchGroup> {
    const [row] = await db.insert(churchGroups).values(data).returning();
    return row;
  }
  async getChurchGroups(churchId: number): Promise<ChurchGroup[]> {
    return await db.select().from(churchGroups)
      .where(eq(churchGroups.churchId, churchId))
      .orderBy(churchGroups.name);
  }
  async updateChurchGroup(id: number, data: Partial<InsertChurchGroup>): Promise<ChurchGroup> {
    const [row] = await db.update(churchGroups).set(data).where(eq(churchGroups.id, id)).returning();
    return row;
  }
  async deleteChurchGroup(id: number): Promise<void> {
    await db.delete(churchGroups).where(eq(churchGroups.id, id));
  }
  async getChurchGroupMembers(groupId: number): Promise<ChurchGroupMember[]> {
    return await db.select().from(churchGroupMembers)
      .where(eq(churchGroupMembers.groupId, groupId))
      .orderBy(churchGroupMembers.joinedAt);
  }
  async addChurchGroupMember(data: InsertChurchGroupMember): Promise<ChurchGroupMember> {
    const [row] = await db.insert(churchGroupMembers).values(data)
      .onConflictDoNothing({ target: [churchGroupMembers.groupId, churchGroupMembers.firebaseUid] })
      .returning();
    return row;
  }
  async removeChurchGroupMember(groupId: number, firebaseUid: string): Promise<void> {
    await db.delete(churchGroupMembers).where(and(eq(churchGroupMembers.groupId, groupId), eq(churchGroupMembers.firebaseUid, firebaseUid)));
  }
  async getChurchGroupMember(groupId: number, firebaseUid: string): Promise<ChurchGroupMember | undefined> {
    const [row] = await db.select().from(churchGroupMembers)
      .where(and(eq(churchGroupMembers.groupId, groupId), eq(churchGroupMembers.firebaseUid, firebaseUid)));
    return row;
  }

  // ── Church Prayer Requests ──────────────────────────────────────────────────
  async createChurchPrayerRequest(data: InsertChurchPrayerRequest): Promise<ChurchPrayerRequest> {
    const [row] = await db.insert(churchPrayerRequests).values(data).returning();
    return row;
  }
  async getChurchPrayerRequests(churchId: number, includeConfidential: boolean): Promise<ChurchPrayerRequest[]> {
    if (includeConfidential) {
      return await db.select().from(churchPrayerRequests)
        .where(eq(churchPrayerRequests.churchId, churchId))
        .orderBy(desc(churchPrayerRequests.createdAt));
    }
    return await db.select().from(churchPrayerRequests)
      .where(and(eq(churchPrayerRequests.churchId, churchId), eq(churchPrayerRequests.isConfidential, false)))
      .orderBy(desc(churchPrayerRequests.createdAt));
  }
  async incrementPrayerCount(id: number): Promise<ChurchPrayerRequest> {
    const [row] = await db.update(churchPrayerRequests)
      .set({ prayerCount: sql`${churchPrayerRequests.prayerCount} + 1` })
      .where(eq(churchPrayerRequests.id, id))
      .returning();
    return row;
  }
  async updateChurchPrayerStatus(id: number, status: string): Promise<ChurchPrayerRequest> {
    const [row] = await db.update(churchPrayerRequests).set({ status }).where(eq(churchPrayerRequests.id, id)).returning();
    return row;
  }
  async deleteChurchPrayerRequest(id: number): Promise<void> {
    await db.delete(churchPrayerRequests).where(eq(churchPrayerRequests.id, id));
  }

  // ── Church Activity Log ─────────────────────────────────────────────────────
  async logChurchActivity(data: InsertChurchActivity): Promise<ChurchActivity> {
    const [row] = await db.insert(churchActivityLog).values(data).returning();
    return row;
  }
  async getChurchActivity(churchId: number, limit = 50): Promise<ChurchActivity[]> {
    return await db.select().from(churchActivityLog)
      .where(eq(churchActivityLog.churchId, churchId))
      .orderBy(desc(churchActivityLog.createdAt))
      .limit(limit);
  }

  // ── Global Admin Church Moderation ──────────────────────────────────────────
  async getAllChurches(): Promise<Church[]> {
    return await db.select().from(churches).orderBy(desc(churches.createdAt));
  }
  async updateChurchStatus(id: number, status: string): Promise<Church> {
    const [row] = await db.update(churches).set({ status }).where(eq(churches.id, id)).returning();
    return row;
  }

  // ── Church Branding ──────────────────────────────────────────────────────────
  async updateChurchLogoUrl(churchId: number, logoUrl: string): Promise<Church> {
    const [row] = await db.update(churches).set({ logoUrl }).where(eq(churches.id, churchId)).returning();
    return row;
  }
  async updateChurchBranding(churchId: number, data: { logoUrl?: string; bannerUrl?: string; themeColor?: string }): Promise<Church> {
    const [row] = await db.update(churches).set(data as any).where(eq(churches.id, churchId)).returning();
    return row;
  }

  // ── Sermon Bookmarks ──────────────────────────────────────────────────────────
  async toggleSermonBookmark(sermonId: number, churchId: number, firebaseUid: string): Promise<boolean> {
    const [existing] = await db.select().from(churchSermonBookmarks)
      .where(and(eq(churchSermonBookmarks.sermonId, sermonId), eq(churchSermonBookmarks.firebaseUid, firebaseUid)));
    if (existing) {
      await db.delete(churchSermonBookmarks).where(eq(churchSermonBookmarks.id, existing.id));
      return false;
    }
    await db.insert(churchSermonBookmarks).values({ sermonId, churchId, firebaseUid });
    return true;
  }
  async getSermonBookmarks(churchId: number, firebaseUid: string): Promise<number[]> {
    const rows = await db.select({ sermonId: churchSermonBookmarks.sermonId })
      .from(churchSermonBookmarks)
      .where(and(eq(churchSermonBookmarks.churchId, churchId), eq(churchSermonBookmarks.firebaseUid, firebaseUid)));
    return rows.map(r => r.sermonId);
  }

  // ── Sermon Notes ──────────────────────────────────────────────────────────────
  async upsertSermonNote(sermonId: number, churchId: number, firebaseUid: string, body: string): Promise<ChurchSermonNote> {
    const [existing] = await db.select().from(churchSermonNotes)
      .where(and(eq(churchSermonNotes.sermonId, sermonId), eq(churchSermonNotes.firebaseUid, firebaseUid)));
    if (existing) {
      const [row] = await db.update(churchSermonNotes)
        .set({ body, updatedAt: new Date() })
        .where(eq(churchSermonNotes.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db.insert(churchSermonNotes).values({ sermonId, churchId, firebaseUid, body }).returning();
    return row;
  }
  async getSermonNote(sermonId: number, firebaseUid: string): Promise<ChurchSermonNote | undefined> {
    const [row] = await db.select().from(churchSermonNotes)
      .where(and(eq(churchSermonNotes.sermonId, sermonId), eq(churchSermonNotes.firebaseUid, firebaseUid)));
    return row;
  }

  // ── Pastor Dashboard Stats ───────────────────────────────────────────────────
  async getChurchDashboardStats(churchId: number): Promise<ChurchDashboardStats> {
    const [memberStats, prayerCount, announcementCount, eventCount, taskCount, noteCount, msgCount,
           deptCount, ssCount, complianceCount,
           nextEventRows, latestAnnRows, latestLessonRows, pendingMembersRows, activePrayersRows,
           recentActivityRows] = await Promise.all([
      db.execute(sql`SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM church_members WHERE church_id = ${churchId}`),
      db.execute(sql`SELECT COUNT(*) FROM church_prayer_requests WHERE church_id = ${churchId} AND status = 'active'`),
      db.execute(sql`SELECT COUNT(*) FROM church_announcements WHERE church_id = ${churchId}`),
      db.execute(sql`SELECT COUNT(*) FROM church_department_events cde
        JOIN church_departments cd ON cde.department_id = cd.id
        WHERE cd.church_id = ${churchId} AND cde.start_date > NOW() AND cd.is_active = true`),
      db.execute(sql`SELECT COUNT(*) FROM church_department_tasks cdt
        JOIN church_departments cd ON cdt.department_id = cd.id
        WHERE cd.church_id = ${churchId} AND cdt.status IN ('pending', 'in_progress')`),
      db.execute(sql`SELECT COUNT(*) FROM church_pastor_notes WHERE church_id = ${churchId} AND status = 'published'`),
      db.execute(sql`SELECT COUNT(*) FROM church_conversations WHERE church_id = ${churchId} AND has_unread_owner = true`),
      db.execute(sql`SELECT COUNT(*) FROM church_departments WHERE church_id = ${churchId} AND is_active = true`),
      db.execute(sql`SELECT COUNT(*) FROM sunday_school_lessons`),
      db.execute(sql`SELECT COUNT(*) FROM compliance_cases WHERE church_id = ${churchId} AND status IN ('open', 'pending_response')`),
      db.execute(sql`SELECT cde.title, cde.start_date, cde.location, cd.name as dept_name
        FROM church_department_events cde
        JOIN church_departments cd ON cde.department_id = cd.id
        WHERE cd.church_id = ${churchId} AND cde.start_date > NOW() AND cd.is_active = true
        ORDER BY cde.start_date ASC LIMIT 1`),
      db.execute(sql`SELECT title, created_at FROM church_announcements WHERE church_id = ${churchId} ORDER BY created_at DESC LIMIT 1`),
      db.execute(sql`SELECT title, date FROM sunday_school_lessons ORDER BY date DESC LIMIT 1`),
      db.execute(sql`SELECT id, display_name, email FROM church_members WHERE church_id = ${churchId} AND status = 'pending' ORDER BY joined_at DESC LIMIT 5`),
      db.execute(sql`SELECT id, title, display_name FROM church_prayer_requests WHERE church_id = ${churchId} AND status = 'active' ORDER BY created_at DESC LIMIT 3`),
      db.execute(sql`
        (SELECT 'member_joined' as type, display_name as description, joined_at as created_at
          FROM church_members WHERE church_id = ${churchId} AND status = 'active' AND joined_at IS NOT NULL)
        UNION ALL
        (SELECT 'announcement' as type, title as description, created_at
          FROM church_announcements WHERE church_id = ${churchId})
        UNION ALL
        (SELECT 'note_published' as type, title as description, published_at as created_at
          FROM church_pastor_notes WHERE church_id = ${churchId} AND status = 'published' AND published_at IS NOT NULL)
        ORDER BY created_at DESC LIMIT 10
      `),
    ]);
    return {
      activeMembers: Number((memberStats.rows[0] as any)?.active ?? 0),
      pendingMembers: Number((memberStats.rows[0] as any)?.pending ?? 0),
      activePrayers: Number((prayerCount.rows[0] as any)?.count ?? 0),
      announcements: Number((announcementCount.rows[0] as any)?.count ?? 0),
      upcomingEvents: Number((eventCount.rows[0] as any)?.count ?? 0),
      openTasks: Number((taskCount.rows[0] as any)?.count ?? 0),
      publishedNotes: Number((noteCount.rows[0] as any)?.count ?? 0),
      unreadMessages: Number((msgCount.rows[0] as any)?.count ?? 0),
      activeDepartments: Number((deptCount.rows[0] as any)?.count ?? 0),
      sundaySchoolLessons: Number((ssCount.rows[0] as any)?.count ?? 0),
      complianceNotices: Number((complianceCount.rows[0] as any)?.count ?? 0),
      nextEvent: (nextEventRows.rows[0] as any) ?? null,
      latestAnnouncement: (latestAnnRows.rows[0] as any) ?? null,
      latestLesson: (latestLessonRows.rows[0] as any) ?? null,
      pendingMembersList: pendingMembersRows.rows as any[],
      activePrayersList: activePrayersRows.rows as any[],
      recentActivity: recentActivityRows.rows as any[],
    };
  }

  // ── Church Pastor Notes ──────────────────────────────────────────────────────
  async listChurchPastorNotes(churchId: number, adminAccess: boolean): Promise<ChurchPastorNote[]> {
    if (adminAccess) {
      return db.select().from(churchPastorNotes)
        .where(eq(churchPastorNotes.churchId, churchId))
        .orderBy(desc(churchPastorNotes.createdAt));
    }
    return db.select().from(churchPastorNotes)
      .where(and(eq(churchPastorNotes.churchId, churchId), eq(churchPastorNotes.status, "published")))
      .orderBy(desc(churchPastorNotes.publishedAt));
  }

  async createChurchPastorNote(data: InsertChurchPastorNote): Promise<ChurchPastorNote> {
    const [row] = await db.insert(churchPastorNotes).values(data).returning();
    return row;
  }

  async updateChurchPastorNote(
    noteId: number, churchId: number,
    data: Partial<InsertChurchPastorNote> & { status?: string; publishedAt?: Date | null }
  ): Promise<ChurchPastorNote> {
    const [row] = await db.update(churchPastorNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(churchPastorNotes.id, noteId), eq(churchPastorNotes.churchId, churchId)))
      .returning();
    return row;
  }

  // ── Church Giving Settings ───────────────────────────────────────────────────
  async getChurchGivingSettings(churchId: number): Promise<ChurchGivingSettings | undefined> {
    const [row] = await db.select().from(churchGivingSettings).where(eq(churchGivingSettings.churchId, churchId));
    return row;
  }
  async upsertChurchGivingSettings(churchId: number, data: Partial<ChurchGivingSettings>): Promise<ChurchGivingSettings> {
    const existing = await this.getChurchGivingSettings(churchId);
    if (existing) {
      const [row] = await db.update(churchGivingSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(churchGivingSettings.churchId, churchId))
        .returning();
      return row;
    }
    const [row] = await db.insert(churchGivingSettings)
      .values({ churchId, ...data })
      .returning();
    return row;
  }

  // ── Church Giving Categories ─────────────────────────────────────────────────
  async getChurchGivingCategories(churchId: number): Promise<ChurchGivingCategory[]> {
    return await db.select().from(churchGivingCategories)
      .where(eq(churchGivingCategories.churchId, churchId))
      .orderBy(churchGivingCategories.displayOrder, churchGivingCategories.id);
  }
  async createChurchGivingCategory(data: { churchId: number; name: string; description?: string; isActive?: boolean; displayOrder?: number }): Promise<ChurchGivingCategory> {
    const [row] = await db.insert(churchGivingCategories).values(data).returning();
    return row;
  }
  async updateChurchGivingCategory(id: number, data: Partial<ChurchGivingCategory>): Promise<ChurchGivingCategory> {
    const [row] = await db.update(churchGivingCategories).set(data).where(eq(churchGivingCategories.id, id)).returning();
    return row;
  }
  async deleteChurchGivingCategory(id: number): Promise<void> {
    await db.delete(churchGivingCategories).where(eq(churchGivingCategories.id, id));
  }

  // ── Church Payout Config ─────────────────────────────────────────────────────
  async getChurchPayoutConfig(churchId: number): Promise<ChurchPayoutConfig | undefined> {
    const [row] = await db.select().from(churchPayoutConfigs).where(eq(churchPayoutConfigs.churchId, churchId));
    return row;
  }
  async upsertChurchPayoutConfig(churchId: number, data: Partial<ChurchPayoutConfig>, updatedBy: string): Promise<ChurchPayoutConfig> {
    const existing = await this.getChurchPayoutConfig(churchId);
    if (existing) {
      const [row] = await db.update(churchPayoutConfigs)
        .set({ ...data, updatedBy, updatedAt: new Date() })
        .where(eq(churchPayoutConfigs.churchId, churchId))
        .returning();
      return row;
    }
    const [row] = await db.insert(churchPayoutConfigs)
      .values({ churchId, updatedBy, ...data })
      .returning();
    return row;
  }

  // ── Church Transactions ──────────────────────────────────────────────────────
  async createChurchTransaction(data: Omit<ChurchTransaction, "id" | "createdAt">): Promise<ChurchTransaction> {
    const [row] = await db.insert(churchTransactions).values(data).returning();
    return row;
  }
  async getChurchTransactionByReference(reference: string): Promise<ChurchTransaction | undefined> {
    const [row] = await db.select().from(churchTransactions).where(eq(churchTransactions.reference, reference));
    return row;
  }
  async getChurchTransactionByStripeSession(sessionId: string): Promise<ChurchTransaction | undefined> {
    const [row] = await db.select().from(churchTransactions).where(eq(churchTransactions.stripeSessionId, sessionId));
    return row;
  }
  async updateChurchTransactionStatus(id: number, status: string, stripePaymentIntentId?: string): Promise<ChurchTransaction> {
    const [row] = await db.update(churchTransactions)
      .set({ status, ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}) })
      .where(eq(churchTransactions.id, id))
      .returning();
    return row;
  }
  async getChurchTransactions(churchId: number, limit = 100): Promise<ChurchTransaction[]> {
    return await db.select().from(churchTransactions)
      .where(eq(churchTransactions.churchId, churchId))
      .orderBy(desc(churchTransactions.createdAt))
      .limit(limit);
  }
  async getAllGivingTransactions(limit = 200): Promise<ChurchTransaction[]> {
    return await db.select().from(churchTransactions)
      .orderBy(desc(churchTransactions.createdAt))
      .limit(limit);
  }

  // ── Global Giving Settings ───────────────────────────────────────────────────
  async getGlobalGivingSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(globalGivingSettings).where(eq(globalGivingSettings.settingKey, key));
    return row?.settingValue ?? null;
  }
  async setGlobalGivingSetting(key: string, value: string, updatedBy?: string): Promise<GlobalGivingSetting> {
    const existing = await this.getGlobalGivingSetting(key);
    if (existing !== null) {
      const [row] = await db.update(globalGivingSettings)
        .set({ settingValue: value, updatedBy: updatedBy ?? null, updatedAt: new Date() })
        .where(eq(globalGivingSettings.settingKey, key))
        .returning();
      return row;
    }
    const [row] = await db.insert(globalGivingSettings)
      .values({ settingKey: key, settingValue: value, updatedBy: updatedBy ?? null })
      .returning();
    return row;
  }
  async getAllGlobalGivingSettings(): Promise<GlobalGivingSetting[]> {
    return await db.select().from(globalGivingSettings);
  }

  async getMyGivingHistory(churchId: number, firebaseUid: string, limit = 50): Promise<ChurchTransaction[]> {
    return await db.select().from(churchTransactions)
      .where(and(eq(churchTransactions.churchId, churchId), eq(churchTransactions.donorFirebaseUid, firebaseUid)))
      .orderBy(desc(churchTransactions.createdAt))
      .limit(limit);
  }

  async seedDefaultGivingCategories(churchId: number): Promise<ChurchGivingCategory[]> {
    const existing = await this.getChurchGivingCategories(churchId);
    if (existing.length > 0) return existing;
    const defaults = [
      { name: "Tithes", description: "10% of income given as an act of worship", displayOrder: 1 },
      { name: "Offering", description: "Freewill offering to support church ministry", displayOrder: 2 },
      { name: "Thanksgiving", description: "Giving in gratitude for God's blessings", displayOrder: 3 },
      { name: "Building Fund", description: "Contributions toward church building projects", displayOrder: 4 },
      { name: "Mission", description: "Support for missionary and outreach work", displayOrder: 5 },
      { name: "Welfare", description: "Support for members and community in need", displayOrder: 6 },
      { name: "Special Donation", description: "Special gifts for designated projects", displayOrder: 7 },
      { name: "General Fund", description: "General support for all church activities", displayOrder: 8 },
    ];
    const inserted = await db.insert(churchGivingCategories)
      .values(defaults.map(d => ({ churchId, ...d, isActive: true })))
      .returning();
    return inserted;
  }

  async getAllGivingStats(): Promise<{ totalDonations: number; totalPlatformFee: number; totalChurchNet: number; count: number }> {
    const txns = await db.select().from(churchTransactions).where(eq(churchTransactions.status, "completed"));
    return {
      totalDonations: txns.reduce((s, t) => s + t.grossAmount, 0),
      totalPlatformFee: txns.reduce((s, t) => s + t.platformFeeAmount, 0),
      totalChurchNet: txns.reduce((s, t) => s + t.churchNetAmount, 0),
      count: txns.length,
    };
  }

  // ── Departments ────────────────────────────────────────────────────────────
  async getDepartments(churchId: number): Promise<ChurchDepartment[]> {
    return db.select().from(churchDepartments)
      .where(and(eq(churchDepartments.churchId, churchId), eq(churchDepartments.isActive, true)))
      .orderBy(churchDepartments.name);
  }
  async getDepartment(id: number): Promise<ChurchDepartment | undefined> {
    const [row] = await db.select().from(churchDepartments).where(eq(churchDepartments.id, id));
    return row;
  }
  async getDepartmentBySlug(churchId: number, slug: string): Promise<ChurchDepartment | undefined> {
    const [row] = await db.select().from(churchDepartments)
      .where(and(eq(churchDepartments.churchId, churchId), eq(churchDepartments.slug, slug)));
    return row;
  }
  async getDepartmentByInviteCode(code: string): Promise<ChurchDepartment | undefined> {
    const [row] = await db.select().from(churchDepartments)
      .where(and(eq(churchDepartments.inviteCode, code), eq(churchDepartments.isActive, true)));
    return row;
  }
  async createDepartment(data: InsertChurchDepartment): Promise<ChurchDepartment> {
    const [row] = await db.insert(churchDepartments).values(data).returning();
    return row;
  }
  async updateDepartment(id: number, data: Partial<InsertChurchDepartment>): Promise<ChurchDepartment> {
    const [row] = await db.update(churchDepartments).set(data).where(eq(churchDepartments.id, id)).returning();
    return row;
  }
  async deleteDepartment(id: number): Promise<void> {
    await db.update(churchDepartments).set({ isActive: false }).where(eq(churchDepartments.id, id));
  }

  async getDepartmentMembers(departmentId: number): Promise<Array<ChurchDepartmentMember & { member: ChurchMember }>> {
    const rows = await db.select({ dm: churchDepartmentMembers, member: churchMembers })
      .from(churchDepartmentMembers)
      .innerJoin(churchMembers, eq(churchDepartmentMembers.churchMemberId, churchMembers.id))
      .where(and(eq(churchDepartmentMembers.departmentId, departmentId), eq(churchDepartmentMembers.isActive, true)))
      .orderBy(churchDepartmentMembers.joinedAt);
    return rows.map(r => ({ ...r.dm, member: r.member }));
  }
  async getMyDepartmentMembership(departmentId: number, churchMemberId: number): Promise<ChurchDepartmentMember | undefined> {
    const [row] = await db.select().from(churchDepartmentMembers)
      .where(and(
        eq(churchDepartmentMembers.departmentId, departmentId),
        eq(churchDepartmentMembers.churchMemberId, churchMemberId),
        eq(churchDepartmentMembers.isActive, true),
      ));
    return row;
  }
  async addDepartmentMember(departmentId: number, churchMemberId: number, role = "member"): Promise<ChurchDepartmentMember> {
    const existing = await this.getMyDepartmentMembership(departmentId, churchMemberId);
    if (existing) {
      if (!existing.isActive) {
        const [row] = await db.update(churchDepartmentMembers)
          .set({ isActive: true, role })
          .where(eq(churchDepartmentMembers.id, existing.id))
          .returning();
        return row;
      }
      return existing;
    }
    const [row] = await db.insert(churchDepartmentMembers).values({ departmentId, churchMemberId, role }).returning();
    return row;
  }
  async removeDepartmentMember(departmentId: number, churchMemberId: number): Promise<void> {
    await db.update(churchDepartmentMembers)
      .set({ isActive: false })
      .where(and(eq(churchDepartmentMembers.departmentId, departmentId), eq(churchDepartmentMembers.churchMemberId, churchMemberId)));
  }
  async updateDepartmentMemberRole(departmentId: number, churchMemberId: number, role: string): Promise<ChurchDepartmentMember> {
    const [row] = await db.update(churchDepartmentMembers)
      .set({ role })
      .where(and(eq(churchDepartmentMembers.departmentId, departmentId), eq(churchDepartmentMembers.churchMemberId, churchMemberId)))
      .returning();
    return row;
  }

  async getDepartmentPosts(departmentId: number, type?: string, limit = 100): Promise<Array<ChurchDepartmentPost & { authorName: string | null }>> {
    const conditions = [eq(churchDepartmentPosts.departmentId, departmentId), eq(churchDepartmentPosts.isDeleted, false)];
    if (type) conditions.push(eq(churchDepartmentPosts.type, type));
    const rows = await db.select({ post: churchDepartmentPosts, memberName: churchMembers.displayName })
      .from(churchDepartmentPosts)
      .leftJoin(churchMembers, eq(churchDepartmentPosts.authorMemberId, churchMembers.id))
      .where(and(...conditions))
      .orderBy(desc(churchDepartmentPosts.createdAt))
      .limit(limit);
    return rows.map(r => ({ ...r.post, authorName: r.memberName ?? null }));
  }
  async createDepartmentPost(data: Omit<typeof churchDepartmentPosts.$inferInsert, "id" | "createdAt" | "isDeleted">): Promise<ChurchDepartmentPost> {
    const [row] = await db.insert(churchDepartmentPosts).values({ ...data, isDeleted: false }).returning();
    return row;
  }
  async deleteDepartmentPost(id: number): Promise<void> {
    await db.update(churchDepartmentPosts).set({ isDeleted: true }).where(eq(churchDepartmentPosts.id, id));
  }
  async pinDepartmentPost(id: number, isPinned: boolean): Promise<void> {
    await db.update(churchDepartmentPosts).set({ isPinned }).where(eq(churchDepartmentPosts.id, id));
  }

  async getDepartmentEvents(departmentId: number): Promise<ChurchDepartmentEvent[]> {
    return db.select().from(churchDepartmentEvents)
      .where(eq(churchDepartmentEvents.departmentId, departmentId))
      .orderBy(churchDepartmentEvents.startDate);
  }
  async createDepartmentEvent(data: InsertChurchDepartmentEvent): Promise<ChurchDepartmentEvent> {
    const [row] = await db.insert(churchDepartmentEvents).values(data).returning();
    return row;
  }
  async updateDepartmentEvent(id: number, data: Partial<InsertChurchDepartmentEvent>): Promise<ChurchDepartmentEvent> {
    const [row] = await db.update(churchDepartmentEvents).set(data).where(eq(churchDepartmentEvents.id, id)).returning();
    return row;
  }
  async deleteDepartmentEvent(id: number): Promise<void> {
    await db.delete(churchDepartmentEvents).where(eq(churchDepartmentEvents.id, id));
  }

  async getDepartmentTasks(departmentId: number): Promise<ChurchDepartmentTask[]> {
    return db.select().from(churchDepartmentTasks)
      .where(eq(churchDepartmentTasks.departmentId, departmentId))
      .orderBy(desc(churchDepartmentTasks.createdAt));
  }
  async createDepartmentTask(data: InsertChurchDepartmentTask): Promise<ChurchDepartmentTask> {
    const [row] = await db.insert(churchDepartmentTasks).values(data).returning();
    return row;
  }
  async updateDepartmentTask(id: number, data: Partial<InsertChurchDepartmentTask>): Promise<ChurchDepartmentTask> {
    const [row] = await db.update(churchDepartmentTasks).set(data).where(eq(churchDepartmentTasks.id, id)).returning();
    return row;
  }
  async deleteDepartmentTask(id: number): Promise<void> {
    await db.delete(churchDepartmentTasks).where(eq(churchDepartmentTasks.id, id));
  }

  async getDepartmentAttendance(departmentId: number): Promise<ChurchDepartmentAttendance[]> {
    return db.select().from(churchDepartmentAttendance)
      .where(eq(churchDepartmentAttendance.departmentId, departmentId))
      .orderBy(desc(churchDepartmentAttendance.sessionDate));
  }
  async createDepartmentAttendance(data: InsertChurchDepartmentAttendance): Promise<ChurchDepartmentAttendance> {
    const [row] = await db.insert(churchDepartmentAttendance).values(data).returning();
    return row;
  }
  async updateDepartmentAttendance(id: number, data: Partial<InsertChurchDepartmentAttendance>): Promise<ChurchDepartmentAttendance> {
    const [row] = await db.update(churchDepartmentAttendance).set(data).where(eq(churchDepartmentAttendance.id, id)).returning();
    return row;
  }

  // ── User Profiles ───────────────────────────────────────────────────────────

  async getUserProfile(firebaseUid: string): Promise<UserProfile | undefined> {
    const [row] = await db.select().from(userProfiles).where(eq(userProfiles.firebaseUid, firebaseUid));
    return row;
  }

  async upsertUserProfile(data: InsertUserProfile): Promise<UserProfile> {
    const [row] = await db
      .insert(userProfiles)
      .values(data)
      .onConflictDoUpdate({
        target: userProfiles.firebaseUid,
        set: {
          displayName: data.displayName,
          email: data.email,
          country: data.country,
          profilePictureUrl: data.profilePictureUrl,
          emailConsentMinistry: data.emailConsentMinistry,
          emailConsentNotifications: data.emailConsentNotifications,
          lastActiveAt: sql`now()`,
        },
      })
      .returning();
    return row;
  }

  async updateUserProfile(
    firebaseUid: string,
    data: Partial<Omit<InsertUserProfile, "firebaseUid" | "email">>
  ): Promise<UserProfile> {
    const [row] = await db
      .update(userProfiles)
      .set({ ...data, lastActiveAt: sql`now()` })
      .where(eq(userProfiles.firebaseUid, firebaseUid))
      .returning();
    return row;
  }

  // ── Activity tracking ───────────────────────────────────────────────────────

  async recordUserActivity(firebaseUid: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await db
      .insert(userActivityDays)
      .values({ firebaseUid, activityDate: today })
      .onConflictDoNothing();
    // Also update last_active_at on the profile (best-effort, non-blocking)
    await db
      .update(userProfiles)
      .set({ lastActiveAt: sql`now()` })
      .where(eq(userProfiles.firebaseUid, firebaseUid));
  }

  // ── Admin: church oversight ─────────────────────────────────────────────────

  async getChurchOversightData(): Promise<any[]> {
    // Returns per-church stats using aggregation sub-selects
    const rows = await db.execute(sql`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.logo_url         AS "logoUrl",
        c.status,
        c.country,
        c.created_at       AS "createdAt",
        c.owner_id         AS "ownerId",
        owner.email        AS "ownerEmail",
        owner.display_name AS "ownerDisplayName",
        (SELECT COUNT(*) FROM church_members m WHERE m.church_id = c.id AND m.status = 'active')   AS "activeMembers",
        (SELECT COUNT(*) FROM church_members m WHERE m.church_id = c.id AND m.status = 'pending')  AS "pendingMembers",
        (SELECT COUNT(*) FROM church_members m WHERE m.church_id = c.id AND m.status IN ('removed','suspended','left')) AS "inactiveMembers",
        (SELECT COUNT(*) FROM church_members m WHERE m.church_id = c.id AND m.role IN ('administrator','lead_pastor','pastor')) AS "adminCount",
        (SELECT COUNT(*) FROM church_departments d WHERE d.church_id = c.id) AS "departmentCount",
        (SELECT COUNT(*) FROM church_announcements a WHERE a.church_id = c.id) AS "announcementCount",
        (SELECT COUNT(*) FROM church_sermons s WHERE s.church_id = c.id) AS "sermonCount",
        (SELECT MAX(ca.created_at) FROM church_activity_log ca WHERE ca.church_id = c.id) AS "lastActivity"
      FROM churches c
      LEFT JOIN user_profiles owner ON owner.firebase_uid = c.owner_id
      ORDER BY c.created_at DESC
    `);
    return rows.rows as any[];
  }

  async getChurchOversightSummary(): Promise<any> {
    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now); startOfMonth.setDate(now.getDate() - 30);

    const totalsResult = await db.execute(sql`
      SELECT
        COUNT(*)                                                            AS "total",
        COUNT(*) FILTER (WHERE status = 'active')                          AS "active",
        COUNT(*) FILTER (WHERE status != 'active')                         AS "inactive",
        COUNT(*) FILTER (WHERE created_at >= ${startOfWeek.toISOString()}) AS "newThisWeek",
        COUNT(*) FILTER (WHERE created_at >= ${startOfMonth.toISOString()}) AS "newThisMonth"
      FROM churches
    `);
    const totals = totalsResult.rows[0];

    const memberTotalsResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') AS "totalActiveMembers"
      FROM church_members
    `);
    const memberTotals = memberTotalsResult.rows[0];

    const byCountry = await db.execute(sql`
      SELECT country, COUNT(*) AS "count"
      FROM churches
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY "count" DESC
    `);

    const membersByCountry = await db.execute(sql`
      SELECT up.country, COUNT(*) AS "count"
      FROM church_members cm
      JOIN user_profiles up ON up.firebase_uid = cm.firebase_uid
      WHERE cm.status = 'active' AND up.country IS NOT NULL
      GROUP BY up.country
      ORDER BY "count" DESC
    `);

    const largest = await db.execute(sql`
      SELECT c.id, c.name, c.slug, c.logo_url AS "logoUrl",
        COUNT(m.id) FILTER (WHERE m.status = 'active') AS "activeMembers"
      FROM churches c
      LEFT JOIN church_members m ON m.church_id = c.id
      GROUP BY c.id, c.name, c.slug, c.logo_url
      ORDER BY "activeMembers" DESC
      LIMIT 10
    `);

    return {
      ...(totals as any),
      totalActiveMembers: Number((memberTotals as any)?.totalActiveMembers ?? 0),
      churchesByCountry: byCountry.rows,
      membersByCountry: membersByCountry.rows,
      largestChurches: largest.rows,
    };
  }

  // ── Pending Members Count ────────────────────────────────────────────────────
  async getPendingMembersCount(churchId: number): Promise<number> {
    const result = await db.execute(sql`SELECT COUNT(*) AS "count" FROM church_members WHERE church_id = ${churchId} AND status = 'pending'`);
    return Number((result.rows[0] as any)?.count ?? 0);
  }

  // ── Department Archive ───────────────────────────────────────────────────────
  async archiveDepartment(id: number): Promise<ChurchDepartment> {
    const [row] = await db.update(churchDepartments)
      .set({ isActive: false, archivedAt: new Date() })
      .where(eq(churchDepartments.id, id))
      .returning();
    return row;
  }

  // ── Audit Log ────────────────────────────────────────────────────────────────
  async createAuditLog(data: { churchId?: number; departmentId?: number; action: string; previousValue?: string; newValue?: string; actorUid: string; actorRole?: string }): Promise<void> {
    await db.insert(auditLogs).values({
      churchId: data.churchId ?? null,
      departmentId: data.departmentId ?? null,
      action: data.action,
      previousValue: data.previousValue ?? null,
      newValue: data.newValue ?? null,
      actorUid: data.actorUid,
      actorRole: data.actorRole ?? null,
    });
  }

  // ── Church Deletion Requests ─────────────────────────────────────────────────
  async createDeletionRequest(data: { churchId: number; ownerUid: string; ownerEmail: string; ownerName?: string; reason: string; explanation?: string }): Promise<ChurchDeletionRequest> {
    const [row] = await db.insert(churchDeletionRequests).values({
      churchId: data.churchId,
      ownerUid: data.ownerUid,
      ownerEmail: data.ownerEmail,
      ownerName: data.ownerName ?? null,
      reason: data.reason,
      explanation: data.explanation ?? null,
      status: "pending",
    }).returning();
    return row;
  }

  async getDeletionRequests(status?: string): Promise<Array<ChurchDeletionRequest & { churchName: string; memberCount: number }>> {
    const reqs = status
      ? await db.select().from(churchDeletionRequests).where(eq(churchDeletionRequests.status, status)).orderBy(desc(churchDeletionRequests.createdAt))
      : await db.select().from(churchDeletionRequests).orderBy(desc(churchDeletionRequests.createdAt));
    return await Promise.all(reqs.map(async r => {
      const church = await this.getChurch(r.churchId);
      const members = await this.getChurchMembers(r.churchId);
      return { ...r, churchName: church?.name ?? "Unknown", memberCount: members.length };
    }));
  }

  async updateDeletionRequestStatus(id: number, status: string, reviewedBy: string, adminNote?: string): Promise<ChurchDeletionRequest> {
    const [row] = await db.update(churchDeletionRequests)
      .set({ status, reviewedBy, reviewedAt: new Date(), adminNote: adminNote ?? null })
      .where(eq(churchDeletionRequests.id, id))
      .returning();
    return row;
  }

  async getMyDeletionRequest(churchId: number, ownerUid: string): Promise<ChurchDeletionRequest | undefined> {
    const [row] = await db.select().from(churchDeletionRequests)
      .where(and(eq(churchDeletionRequests.churchId, churchId), eq(churchDeletionRequests.ownerUid, ownerUid)))
      .orderBy(desc(churchDeletionRequests.createdAt));
    return row;
  }

  // ── Admin: app analytics ────────────────────────────────────────────────────

  async getAppAnalytics(): Promise<any> {
    const today = new Date().toISOString().slice(0, 10);
    const d7  = new Date(); d7.setDate(d7.getDate() - 7);
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    const d7str  = d7.toISOString().slice(0, 10);
    const d30str = d30.toISOString().slice(0, 10);

    const dauRes      = await db.execute(sql`SELECT COUNT(DISTINCT firebase_uid) AS "dau" FROM user_activity_days WHERE activity_date = ${today}`);
    const wauRes      = await db.execute(sql`SELECT COUNT(DISTINCT firebase_uid) AS "wau" FROM user_activity_days WHERE activity_date >= ${d7str}`);
    const mauRes      = await db.execute(sql`SELECT COUNT(DISTINCT firebase_uid) AS "mau" FROM user_activity_days WHERE activity_date >= ${d30str}`);
    const totalRes    = await db.execute(sql`SELECT COUNT(*) AS "total" FROM user_profiles`);
    const weekRes     = await db.execute(sql`SELECT COUNT(*) AS "count" FROM user_profiles WHERE created_at >= ${d7.toISOString()}`);
    const monthRes    = await db.execute(sql`SELECT COUNT(*) AS "count" FROM user_profiles WHERE created_at >= ${d30.toISOString()}`);

    const dailyTrend = await db.execute(sql`
      SELECT activity_date AS "date", COUNT(DISTINCT firebase_uid) AS "users"
      FROM user_activity_days
      WHERE activity_date >= ${d30str}
      GROUP BY activity_date
      ORDER BY activity_date ASC
    `);

    const byCountry = await db.execute(sql`
      SELECT country, COUNT(*) AS "count"
      FROM user_profiles
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY "count" DESC
      LIMIT 20
    `);

    return {
      dau:           Number((dauRes.rows[0]   as any)?.dau   ?? 0),
      wau:           Number((wauRes.rows[0]   as any)?.wau   ?? 0),
      mau:           Number((mauRes.rows[0]   as any)?.mau   ?? 0),
      totalUsers:    Number((totalRes.rows[0] as any)?.total ?? 0),
      newThisWeek:   Number((weekRes.rows[0]  as any)?.count ?? 0),
      newThisMonth:  Number((monthRes.rows[0] as any)?.count ?? 0),
      dailyTrend:    dailyTrend.rows,
      usersByCountry: byCountry.rows,
    };
  }

  // ── Platform Governance ─────────────────────────────────────────────────────

  async updateChurchPlatformStatus(id: number, platformStatus: string, reviewNote?: string, reviewedBy?: string): Promise<Church> {
    const [row] = await db.update(churches).set({
      platformStatus,
      platformReviewNote: reviewNote ?? null,
      platformReviewedAt: new Date(),
      platformReviewedBy: reviewedBy ?? null,
    }).where(eq(churches.id, id)).returning();
    return row;
  }

  async getPendingReviewChurches(): Promise<Church[]> {
    return await db.select().from(churches).where(eq(churches.platformStatus, "pending_review")).orderBy(desc(churches.createdAt));
  }

  async getChurchesByPlatformStatus(status: string): Promise<Church[]> {
    return await db.select().from(churches).where(eq(churches.platformStatus, status)).orderBy(desc(churches.createdAt));
  }

  // ── Compliance Cases ────────────────────────────────────────────────────────

  async createComplianceCase(data: InsertComplianceCase): Promise<ComplianceCase> {
    const [row] = await db.insert(complianceCases).values(data).returning();
    return row;
  }

  async getComplianceCases(churchId?: number): Promise<ComplianceCase[]> {
    if (churchId !== undefined) {
      return await db.select().from(complianceCases).where(eq(complianceCases.churchId, churchId)).orderBy(desc(complianceCases.createdAt));
    }
    return await db.select().from(complianceCases).orderBy(desc(complianceCases.createdAt));
  }

  async getComplianceCase(id: number): Promise<ComplianceCase | undefined> {
    const [row] = await db.select().from(complianceCases).where(eq(complianceCases.id, id));
    return row;
  }

  async updateComplianceCase(id: number, data: Partial<ComplianceCase>): Promise<ComplianceCase> {
    const [row] = await db.update(complianceCases).set({ ...data, updatedAt: new Date() }).where(eq(complianceCases.id, id)).returning();
    return row;
  }

  async createComplianceCaseResponse(data: InsertComplianceCaseResponse): Promise<ComplianceCaseResponse> {
    const [row] = await db.insert(complianceCaseResponses).values(data).returning();
    return row;
  }

  async getComplianceCaseResponses(caseId: number): Promise<ComplianceCaseResponse[]> {
    return await db.select().from(complianceCaseResponses).where(eq(complianceCaseResponses.caseId, caseId)).orderBy(complianceCaseResponses.createdAt);
  }

  // ── Appeals ─────────────────────────────────────────────────────────────────

  async createComplianceAppeal(data: InsertComplianceAppeal): Promise<ComplianceAppeal> {
    const [row] = await db.insert(complianceAppeals).values(data).returning();
    return row;
  }

  async getComplianceAppeals(churchId?: number): Promise<ComplianceAppeal[]> {
    if (churchId !== undefined) {
      return await db.select().from(complianceAppeals).where(eq(complianceAppeals.churchId, churchId)).orderBy(desc(complianceAppeals.createdAt));
    }
    return await db.select().from(complianceAppeals).orderBy(desc(complianceAppeals.createdAt));
  }

  async updateComplianceAppeal(id: number, data: Partial<ComplianceAppeal>): Promise<ComplianceAppeal> {
    const [row] = await db.update(complianceAppeals).set(data as any).where(eq(complianceAppeals.id, id)).returning();
    return row;
  }

  // ── Platform Admin Threads ──────────────────────────────────────────────────

  async createPlatformAdminThread(data: InsertPlatformAdminThread): Promise<PlatformAdminThread> {
    const [row] = await db.insert(platformAdminThreads).values(data).returning();
    return row;
  }

  async getPlatformAdminThreads(churchId?: number): Promise<PlatformAdminThread[]> {
    if (churchId !== undefined) {
      return await db.select().from(platformAdminThreads).where(eq(platformAdminThreads.churchId, churchId)).orderBy(desc(platformAdminThreads.updatedAt));
    }
    return await db.select().from(platformAdminThreads).orderBy(desc(platformAdminThreads.updatedAt));
  }

  /** Scoped lookup: returns the thread belonging to this specific owner in this church. */
  async getOwnerPlatformAdminThread(churchId: number, ownerUid: string): Promise<PlatformAdminThread | undefined> {
    const [row] = await db.select().from(platformAdminThreads)
      .where(and(eq(platformAdminThreads.churchId, churchId), eq(platformAdminThreads.ownerUid, ownerUid)))
      .orderBy(desc(platformAdminThreads.updatedAt));
    return row;
  }

  async getPlatformAdminThread(id: number): Promise<PlatformAdminThread | undefined> {
    const [row] = await db.select().from(platformAdminThreads).where(eq(platformAdminThreads.id, id));
    return row;
  }

  async updatePlatformAdminThread(id: number, data: Partial<PlatformAdminThread>): Promise<PlatformAdminThread> {
    const [row] = await db.update(platformAdminThreads).set({ ...data, updatedAt: new Date() }).where(eq(platformAdminThreads.id, id)).returning();
    return row;
  }

  async createPlatformAdminMessage(data: InsertPlatformAdminMessage): Promise<PlatformAdminMessage> {
    const [row] = await db.insert(platformAdminMessages).values(data).returning();
    return row;
  }

  async getPlatformAdminMessages(threadId: number): Promise<PlatformAdminMessage[]> {
    return await db.select().from(platformAdminMessages).where(eq(platformAdminMessages.threadId, threadId)).orderBy(platformAdminMessages.createdAt);
  }

  // ── Platform Announcements ──────────────────────────────────────────────────

  async createPlatformAnnouncement(data: InsertPlatformAnnouncement): Promise<PlatformAnnouncement> {
    const [row] = await db.insert(platformAnnouncements).values(data).returning();
    return row;
  }

  async getPlatformAnnouncements(): Promise<PlatformAnnouncement[]> {
    return await db.select().from(platformAnnouncements).orderBy(desc(platformAnnouncements.createdAt));
  }

  async getSentAnnouncementsForUser(firebaseUid: string): Promise<(PlatformAnnouncement & { isRead: boolean })[]> {
    // 1. Get user's active church memberships
    const memberships = await db.select().from(churchMembers)
      .where(and(eq(churchMembers.firebaseUid, firebaseUid), eq(churchMembers.status, "active")));
    if (memberships.length === 0) return [];

    const userChurchIds = new Set(memberships.map(m => m.churchId));
    const userRoles = new Set(memberships.map(m => m.role));

    // 1b. Fetch user profile for country/language targeting
    const profileRes = await db.execute(sql`SELECT country, preferred_language FROM user_profiles WHERE firebase_uid = ${firebaseUid} LIMIT 1`);
    const userProfile = profileRes.rows[0] as { country?: string; preferred_language?: string } | undefined;
    const userCountry = (userProfile?.country ?? "").toUpperCase().trim();
    const userLanguage = (userProfile?.preferred_language ?? "").toLowerCase().trim();

    // 2. Get all sent announcements
    const sent = await db.select().from(platformAnnouncements)
      .where(sql`sent_at IS NOT NULL`)
      .orderBy(desc(platformAnnouncements.sentAt));
    if (sent.length === 0) return [];

    // 3. Get read status for this user
    const reads = await db.select().from(platformAnnouncementReads)
      .where(and(
        eq(platformAnnouncementReads.firebaseUid, firebaseUid),
        inArray(platformAnnouncementReads.announcementId, sent.map(a => a.id))
      ));
    const readSet = new Set(reads.map(r => r.announcementId));

    // 4. Filter to announcements this user was actually targeted by
    const isRecipient = (ann: PlatformAnnouncement): boolean => {
      switch (ann.targetType) {
        case "everyone":
          return memberships.length > 0;
        case "org_owners":
          return userRoles.has("owner") || userRoles.has("lead_pastor");
        case "church_owners":
          return userRoles.has("owner");
        case "ministry_owners":
          return userRoles.has("lead_pastor");
        case "org_admins":
          return ["owner", "lead_pastor", "administrator"].some(r => userRoles.has(r));
        case "dept_leaders":
          // Canonical dept-leader-equivalent roles in this codebase
          return ["owner", "lead_pastor", "administrator", "ministry_leader", "group_leader"].some(r => userRoles.has(r));
        case "members_specific": {
          const targetIds = (ann.targetFilter ?? "").split(",").map(Number).filter(Boolean);
          return targetIds.some(id => userChurchIds.has(id));
        }
        case "country": {
          // targetFilter is comma-separated country codes, e.g. "NG,US"
          if (!ann.targetFilter) return memberships.length > 0;
          const codes = ann.targetFilter.toUpperCase().split(",").map(s => s.trim()).filter(Boolean);
          if (codes.length === 0 || !userCountry) return false;
          return codes.includes(userCountry);
        }
        case "language": {
          // targetFilter is comma-separated BCP-47 codes, e.g. "en,es,fr"
          if (!ann.targetFilter) return memberships.length > 0;
          const langs = ann.targetFilter.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
          if (langs.length === 0 || !userLanguage) return false;
          return langs.includes(userLanguage);
        }
        default:
          return false;
      }
    };

    return sent.filter(isRecipient).map(a => ({ ...a, isRead: readSet.has(a.id) }));
  }

  async markAnnouncementRead(announcementId: number, firebaseUid: string): Promise<void> {
    await db.insert(platformAnnouncementReads)
      .values({ announcementId, firebaseUid })
      .onConflictDoNothing();
  }

  async sendPlatformAnnouncement(id: number): Promise<PlatformAnnouncement & { deliveryCount: number }> {
    // 1. Fetch announcement
    const [ann] = await db.select().from(platformAnnouncements).where(eq(platformAnnouncements.id, id));
    if (!ann) throw new Error("Announcement not found");
    if (ann.sentAt) throw new Error("Announcement already sent");

    // 2. Resolve recipient churches based on targetType
    const approvedChurches = await db.select().from(churches).where(eq(churches.platformStatus, "approved"));
    let recipientChurches: (typeof churches.$inferSelect)[] = [];

    if (ann.targetType === "everyone" || ann.targetType === "org_owners" || ann.targetType === "org_admins") {
      recipientChurches = approvedChurches;
    } else if (ann.targetType === "country" && ann.targetFilter) {
      // Country targeting filters at member level (user_profiles.country) for consistency
      // with getSentAnnouncementsForUser — we use all approved churches here and filter
      // members by their profile country inside the delivery loop.
      recipientChurches = approvedChurches;
    } else if (ann.targetType === "dept_leaders") {
      // dept_leaders: all approved orgs (qualifying role check below will filter to dept leaders)
      recipientChurches = approvedChurches;
    } else if (ann.targetType === "language" && ann.targetFilter) {
      // Language targeting filters at member level via user_profiles.preferred_language
      // (consistent with getSentAnnouncementsForUser). Use all approved churches as base.
      recipientChurches = approvedChurches;
    } else if (ann.targetType === "members_specific" && ann.targetFilter) {
      // targetFilter is a comma-separated list of church IDs
      const ids = ann.targetFilter.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      recipientChurches = approvedChurches.filter(c => ids.includes(c.id));
    } else {
      recipientChurches = approvedChurches;
    }

    // 3. Determine qualifying member roles for this target type
    // null = no role filter (reach all active members in scope)
    const targetRoles: string[] | null =
      ann.targetType === "org_admins"
        ? ["owner", "lead_pastor", "administrator"]
        : ann.targetType === "dept_leaders"
          ? ["owner", "lead_pastor", "administrator", "ministry_leader", "group_leader"]
          : ann.targetType === "org_owners"
            ? ["owner", "lead_pastor"]
            : ann.targetType === "church_owners"
              ? ["owner"]
              : ann.targetType === "ministry_owners"
                ? ["lead_pastor"]
                : null; // everyone, members_specific, country, language → all active members

    // 4. Deliver in-app (platform admin thread) and optionally email.
    // "email" channel is the only trigger for email sends; "inbox" is in-app only.
    const deliverEmail = Array.isArray(ann.deliveryChannels) && ann.deliveryChannels.includes("email");
    let emailClient: { client: any; fromEmail: string } | null = null;
    if (deliverEmail) {
      try {
        const { getUncachableSendGridClient } = await import("./sendgrid");
        emailClient = await getUncachableSendGridClient();
      } catch { /* email optional — log and continue */ console.warn("[Announcement] SendGrid not available; skipping email delivery"); }
    }

    const deliverInbox = Array.isArray(ann.deliveryChannels) && ann.deliveryChannels.includes("inbox");

    let deliveryCount = 0;
    const subject = `[Platform Announcement] ${ann.title}`;
    const msgBody = `**${ann.title}**\n\n${ann.body}`;

    // Note: "in_app" channel is served by getSentAnnouncementsForUser reading the
    // platformAnnouncements table — no per-user DB row needed beyond marking sent.
    // "inbox" channel writes to the platformAdminThreads conversation thread.
    // "email" channel sends via SendGrid (handled below).

    // Pre-parse country/language filters for member-level delivery filtering.
    // Both use user_profiles fields, consistent with getSentAnnouncementsForUser feed.
    const countryFilter = ann.targetType === "country" && ann.targetFilter
      ? ann.targetFilter.toUpperCase().split(",").map(s => s.trim()).filter(Boolean)
      : null;
    const languageFilter = ann.targetType === "language" && ann.targetFilter
      ? ann.targetFilter.toLowerCase().split(",").map(s => s.trim()).filter(Boolean)
      : null;

    for (const church of recipientChurches) {
      try {
        const members = await db.select().from(churchMembers).where(eq(churchMembers.churchId, church.id));
        let qualifiedMembers = members.filter(m =>
          m.status === "active" && (targetRoles === null || targetRoles.includes(m.role))
        );
        if (qualifiedMembers.length === 0) continue;

        // Country/language targeting: filter at member level via user_profiles for
        // consistency with getSentAnnouncementsForUser feed (unified logic).
        if ((countryFilter && countryFilter.length > 0) || (languageFilter && languageFilter.length > 0)) {
          const uids = qualifiedMembers.map(m => m.firebaseUid);
          if (uids.length > 0) {
            const profileRows = await db.execute(sql`SELECT firebase_uid, country, preferred_language FROM user_profiles WHERE firebase_uid = ANY(${sql.raw(`ARRAY[${uids.map(u => `'${u.replace(/'/g, "''")}'`).join(",")}]`)})`);
            const profileMap = new Map((profileRows.rows as any[]).map(r => [r.firebase_uid, { country: (r.country ?? "").toUpperCase().trim(), lang: (r.preferred_language ?? "").toLowerCase().trim() }]));
            qualifiedMembers = qualifiedMembers.filter(m => {
              const p = profileMap.get(m.firebaseUid);
              if (countryFilter && countryFilter.length > 0) {
                return p && p.country && countryFilter.includes(p.country);
              }
              if (languageFilter && languageFilter.length > 0) {
                return p && p.lang && languageFilter.includes(p.lang);
              }
              return true;
            });
          }
          if (qualifiedMembers.length === 0) continue;
        }

        // 4a. Inbox channel: deliver per-recipient thread so each targeted user sees the message
        if (deliverInbox) {
          for (const m of qualifiedMembers) {
            try {
              // Each qualified member gets their own platform admin thread (keyed by churchId+uid)
              const existingThreads = await db.select().from(platformAdminThreads)
                .where(and(eq(platformAdminThreads.churchId, church.id), eq(platformAdminThreads.ownerUid, m.firebaseUid)));
              let thread = existingThreads[0];
              if (!thread) {
                [thread] = await db.insert(platformAdminThreads).values({
                  churchId: church.id, ownerUid: m.firebaseUid, subject, status: "open",
                  hasUnreadAdmin: false, hasUnreadOwner: true,
                }).returning();
              }
              await db.insert(platformAdminMessages).values({ threadId: thread.id, senderType: "admin", senderUid: "platform_admin", message: msgBody });
              await db.update(platformAdminThreads).set({ hasUnreadOwner: true, updatedAt: new Date() }).where(eq(platformAdminThreads.id, thread.id));
            } catch { /* skip individual member inbox failure */ }
          }
        }

        // 4b. Email: send to qualified member emails (respects opt-in via email_consent_notifications)
        if (emailClient) {
          for (const m of qualifiedMembers) {
            if (!m.email) continue;
            try {
              // Check user profile for email consent (non-blocking if profile absent)
              const profileRows = await db.execute(sql`SELECT email_consent_notifications FROM user_profiles WHERE firebase_uid = ${m.firebaseUid} LIMIT 1`);
              const profile = profileRows.rows[0] as any;
              if (profile && profile.email_consent_notifications === false) continue;
              await emailClient.client.send({
                to: m.email,
                from: emailClient.fromEmail,
                subject,
                text: `${ann.title}\n\n${ann.body}`,
                html: `<h2>${ann.title}</h2><p>${ann.body.replace(/\n/g, "<br/>")}</p><hr/><p style="font-size:12px;color:#888">You received this because you are a leader in an organization on 365 Daily Devotional Church Mode.</p>`,
              });
            } catch { /* skip failed individual email */ }
          }
        }

        deliveryCount++;
      } catch { /* skip failed church delivery */ }
    }

    // 5. Mark announcement as sent and write audit trail
    const [row] = await db.update(platformAnnouncements).set({ sentAt: new Date() }).where(eq(platformAnnouncements.id, id)).returning();
    await this.createAuditLog({
      action: "announcement_sent",
      newValue: JSON.stringify({ title: ann.title, targetType: ann.targetType, channels: ann.deliveryChannels, recipientCount: deliveryCount }),
      actorUid: "platform_admin",
    }).catch(() => {});
    return { ...row, deliveryCount };
  }

  // ── Family / Group Mode ───────────────────────────────────────────────────

  async createGroup(data: InsertGroup): Promise<Group> {
    const [row] = await db.insert(groups).values(data).returning();
    return row;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [row] = await db.select().from(groups).where(eq(groups.id, id));
    return row;
  }

  async getGroupByInviteCode(code: string): Promise<Group | undefined> {
    const [row] = await db.select().from(groups).where(eq(groups.inviteCode, code));
    return row;
  }

  async getUserGroups(firebaseUid: string): Promise<(GroupMember & { group: Group })[]> {
    const rows = await db
      .select()
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.firebaseUid, firebaseUid))
      .orderBy(desc(groupMembers.joinedAt));
    return rows.map(r => ({ ...r.group_members, group: r.groups }));
  }

  async updateGroup(id: number, data: Partial<InsertGroup>): Promise<Group> {
    const [row] = await db.update(groups).set(data).where(eq(groups.id, id)).returning();
    return row;
  }

  async deleteGroup(id: number): Promise<void> {
    await db.delete(groups).where(eq(groups.id, id));
  }

  async addGroupMember(data: InsertGroupMember): Promise<GroupMember> {
    const [row] = await db.insert(groupMembers).values(data).returning();
    return row;
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId)).orderBy(groupMembers.joinedAt);
  }

  async getGroupMember(groupId: number, firebaseUid: string): Promise<GroupMember | undefined> {
    const [row] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.firebaseUid, firebaseUid)));
    return row;
  }

  async updateGroupMemberRole(id: number, role: string): Promise<GroupMember> {
    const [row] = await db.update(groupMembers).set({ role }).where(eq(groupMembers.id, id)).returning();
    return row;
  }

  async removeGroupMember(groupId: number, firebaseUid: string): Promise<void> {
    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.firebaseUid, firebaseUid)));
  }

  async createGroupPrayerRequest(data: InsertGroupPrayerRequest): Promise<GroupPrayerRequest> {
    const [row] = await db.insert(groupPrayerRequests).values(data).returning();
    return row;
  }

  async getGroupPrayerRequests(groupId: number): Promise<GroupPrayerRequest[]> {
    return await db.select().from(groupPrayerRequests).where(eq(groupPrayerRequests.groupId, groupId)).orderBy(desc(groupPrayerRequests.createdAt));
  }

  async updateGroupPrayerStatus(id: number, status: string): Promise<GroupPrayerRequest> {
    const [row] = await db.update(groupPrayerRequests).set({ status }).where(eq(groupPrayerRequests.id, id)).returning();
    return row;
  }

  async incrementGroupPrayingCount(id: number): Promise<GroupPrayerRequest> {
    const [row] = await db.update(groupPrayerRequests).set({ prayingCount: sql`${groupPrayerRequests.prayingCount} + 1` }).where(eq(groupPrayerRequests.id, id)).returning();
    return row;
  }

  async createGroupMessage(data: InsertGroupMessage): Promise<GroupMessage> {
    const [row] = await db.insert(groupMessagesTable).values(data).returning();
    return row;
  }

  async getGroupMessages(groupId: number, limit = 100): Promise<GroupMessage[]> {
    const rows = await db.select().from(groupMessagesTable).where(eq(groupMessagesTable.groupId, groupId)).orderBy(desc(groupMessagesTable.createdAt)).limit(limit);
    return rows.reverse();
  }

  async createGroupDevotionalShare(data: InsertGroupDevotionalShare): Promise<GroupDevotionalShare> {
    const [row] = await db.insert(groupDevotionalShares).values(data).returning();
    return row;
  }

  async getGroupDevotionalShares(groupId: number): Promise<(GroupDevotionalShare & { reactions: GroupDevotionalReaction[] })[]> {
    const shares = await db.select().from(groupDevotionalShares).where(eq(groupDevotionalShares.groupId, groupId)).orderBy(desc(groupDevotionalShares.createdAt));
    const shareIds = shares.map(s => s.id);
    const reactions = shareIds.length > 0
      ? await db.select().from(groupDevotionalReactions).where(inArray(groupDevotionalReactions.shareId, shareIds))
      : [];
    return shares.map(s => ({ ...s, reactions: reactions.filter(r => r.shareId === s.id) }));
  }

  async toggleGroupDevotionalReaction(data: InsertGroupDevotionalReaction): Promise<{ added: boolean }> {
    const existing = await db.select().from(groupDevotionalReactions).where(
      and(eq(groupDevotionalReactions.shareId, data.shareId), eq(groupDevotionalReactions.firebaseUid, data.firebaseUid), eq(groupDevotionalReactions.reaction, data.reaction))
    );
    if (existing.length > 0) {
      await db.delete(groupDevotionalReactions).where(eq(groupDevotionalReactions.id, existing[0].id));
      return { added: false };
    }
    await db.insert(groupDevotionalReactions).values(data);
    return { added: true };
  }

  async createGroupAnnouncement(data: InsertGroupAnnouncement): Promise<GroupAnnouncement> {
    const [row] = await db.insert(groupAnnouncements).values(data).returning();
    return row;
  }

  async getGroupAnnouncements(groupId: number): Promise<GroupAnnouncement[]> {
    return await db.select().from(groupAnnouncements).where(eq(groupAnnouncements.groupId, groupId)).orderBy(desc(groupAnnouncements.createdAt));
  }

  async deleteGroupAnnouncement(id: number): Promise<void> {
    await db.delete(groupAnnouncements).where(eq(groupAnnouncements.id, id));
  }

  // ── Governance Summary ──────────────────────────────────────────────────────

  async getGovernanceSummary(): Promise<{ pendingReview: number; openCases: number; pendingAppeals: number; pendingDeletions: number; recentApprovals: number; recentSuspensions: number }> {
    const d7 = new Date(); d7.setDate(d7.getDate() - 7);

    const [pendingReviewRes, openCasesRes, pendingAppealsRes, pendingDeletionsRes, recentApprovalsRes, recentSuspensionsRes] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) AS c FROM churches WHERE platform_status IN ('draft','submitted','pending_review')`),
      db.execute(sql`SELECT COUNT(*) AS c FROM compliance_cases WHERE status NOT IN ('resolved','closed')`),
      db.execute(sql`SELECT COUNT(*) AS c FROM compliance_appeals WHERE status = 'pending'`),
      db.execute(sql`SELECT COUNT(*) AS c FROM church_deletion_requests WHERE status = 'pending'`),
      db.execute(sql`SELECT COUNT(*) AS c FROM churches WHERE platform_status = 'approved' AND platform_reviewed_at >= ${d7.toISOString()}`),
      db.execute(sql`SELECT COUNT(*) AS c FROM churches WHERE platform_status = 'suspended' AND platform_reviewed_at >= ${d7.toISOString()}`),
    ]);

    return {
      pendingReview:    Number((pendingReviewRes.rows[0]   as any)?.c ?? 0),
      openCases:        Number((openCasesRes.rows[0]       as any)?.c ?? 0),
      pendingAppeals:   Number((pendingAppealsRes.rows[0]  as any)?.c ?? 0),
      pendingDeletions: Number((pendingDeletionsRes.rows[0] as any)?.c ?? 0),
      recentApprovals:  Number((recentApprovalsRes.rows[0] as any)?.c ?? 0),
      recentSuspensions:Number((recentSuspensionsRes.rows[0] as any)?.c ?? 0),
    };
  }
}

export const storage = new DatabaseStorage();
