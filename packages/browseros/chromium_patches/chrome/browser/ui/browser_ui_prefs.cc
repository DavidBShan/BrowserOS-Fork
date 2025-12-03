diff --git a/chrome/browser/ui/browser_ui_prefs.cc b/chrome/browser/ui/browser_ui_prefs.cc
index 7a2f76324af50..650e83f6a9742 100644
--- a/chrome/browser/ui/browser_ui_prefs.cc
+++ b/chrome/browser/ui/browser_ui_prefs.cc
@@ -65,7 +65,7 @@ void RegisterBrowserPrefs(PrefRegistrySimple* registry) {
 
   registry->RegisterBooleanPref(prefs::kHoverCardImagesEnabled, true);
 
-  registry->RegisterBooleanPref(prefs::kHoverCardMemoryUsageEnabled, true);
+  registry->RegisterBooleanPref(prefs::kHoverCardMemoryUsageEnabled, false);
 
 #if defined(USE_AURA)
   registry->RegisterBooleanPref(prefs::kOverscrollHistoryNavigationEnabled,
