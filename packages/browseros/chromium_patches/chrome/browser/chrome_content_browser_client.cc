diff --git a/chrome/browser/chrome_content_browser_client.cc b/chrome/browser/chrome_content_browser_client.cc
index 0ab10486a183c..4c3dcda0e8f8f 100644
--- a/chrome/browser/chrome_content_browser_client.cc
+++ b/chrome/browser/chrome_content_browser_client.cc
@@ -1439,7 +1439,7 @@ void ChromeContentBrowserClient::RegisterLocalStatePrefs(
 void ChromeContentBrowserClient::RegisterProfilePrefs(
     user_prefs::PrefRegistrySyncable* registry) {
   registry->RegisterBooleanPref(prefs::kDisable3DAPIs, false);
-  registry->RegisterBooleanPref(prefs::kEnableHyperlinkAuditing, true);
+  registry->RegisterBooleanPref(prefs::kEnableHyperlinkAuditing, false);
   // Register user prefs for mapping SitePerProcess and IsolateOrigins in
   // user policy in addition to the same named ones in Local State (which are
   // used for mapping the command-line flags).
