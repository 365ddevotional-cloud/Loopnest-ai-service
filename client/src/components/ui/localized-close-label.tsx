import { useI18n } from "@/hooks/useI18n";

export function LocalizedCloseLabel() {
  const { t } = useI18n();
  return <>{t("cm_close")}</>;
}
