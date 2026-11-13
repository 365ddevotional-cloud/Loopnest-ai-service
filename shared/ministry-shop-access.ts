const shopAdminEmail = "365ddevotional@gmail.com";

export function isMinistryShopAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === shopAdminEmail;
}
