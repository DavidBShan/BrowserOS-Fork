diff --git a/chrome/common/pref_names.h b/chrome/common/pref_names.h
index 1a4683393ff24..834756f0847ea 100644
--- a/chrome/common/pref_names.h
+++ b/chrome/common/pref_names.h
@@ -1583,6 +1583,8 @@ inline constexpr char kImportDialogSavedPasswords[] =
     "import_dialog_saved_passwords";
 inline constexpr char kImportDialogSearchEngine[] =
     "import_dialog_search_engine";
+inline constexpr char kImportDialogExtensions[] =
+    "import_dialog_extensions";
 
 // Profile avatar and name
 inline constexpr char kProfileAvatarIndex[] = "profile.avatar_index";
@@ -4302,6 +4304,29 @@ inline constexpr char kNonMilestoneUpdateToastVersion[] =
     "toast.non_milestone_update_toast_version";
 #endif  // !BUILDFLAG(IS_ANDROID)
 
+// String containing the stable client ID for BrowserOS metrics
+inline constexpr char kBrowserOSMetricsClientId[] =
+    "browseros.metrics_client_id";
+
+// String containing the stable install ID for BrowserOS metrics (Local State)
+inline constexpr char kBrowserOSMetricsInstallId[] =
+    "browseros.metrics_install_id";
+
+// JSON string containing custom AI providers for BrowserOS
+inline constexpr char kBrowserOSCustomProviders[] =
+    "browseros.custom_providers";
+
+// JSON string containing the list of AI providers and configuration
+inline constexpr char kBrowserOSProviders[] = "browseros.providers";
+
+// String containing the default provider ID for BrowserOS
+inline constexpr char kBrowserOSDefaultProviderId[] =
+    "browseros.default_provider_id";
+
+// Boolean that controls whether toolbar labels are shown for BrowserOS actions
+inline constexpr char kBrowserOSShowToolbarLabels[] =
+    "browseros.show_toolbar_labels";
+
 }  // namespace prefs
 
 #endif  // CHROME_COMMON_PREF_NAMES_H_
