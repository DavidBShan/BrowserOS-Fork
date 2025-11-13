diff --git a/chrome/browser/themes/theme_service_factory.cc b/chrome/browser/themes/theme_service_factory.cc
index 1809d9f6aff5b..45a59449fd178 100644
--- a/chrome/browser/themes/theme_service_factory.cc
+++ b/chrome/browser/themes/theme_service_factory.cc
@@ -127,11 +127,11 @@ void ThemeServiceFactory::RegisterProfilePrefs(
   registry->RegisterIntegerPref(prefs::kPolicyThemeColor, SK_ColorTRANSPARENT);
   registry->RegisterIntegerPref(
       prefs::kBrowserColorSchemeDoNotUse,
-      static_cast<int>(ThemeService::BrowserColorScheme::kSystem),
+      static_cast<int>(ThemeService::BrowserColorScheme::kLight),
       user_prefs::PrefRegistrySyncable::SYNCABLE_PREF);
   registry->RegisterIntegerPref(
       prefs::kNonSyncingBrowserColorSchemeDoNotUse,
-      static_cast<int>(ThemeService::BrowserColorScheme::kSystem));
+      static_cast<int>(ThemeService::BrowserColorScheme::kLight));
   registry->RegisterIntegerPref(
       prefs::kUserColorDoNotUse, SK_ColorTRANSPARENT,
       user_prefs::PrefRegistrySyncable::SYNCABLE_PREF);
