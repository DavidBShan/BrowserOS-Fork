diff --git a/chrome/browser/ui/browser_command_controller.cc b/chrome/browser/ui/browser_command_controller.cc
index deb531f8832e3..aa697f378d47b 100644
--- a/chrome/browser/ui/browser_command_controller.cc
+++ b/chrome/browser/ui/browser_command_controller.cc
@@ -70,6 +70,8 @@
 #include "chrome/browser/ui/ui_features.h"
 #include "chrome/browser/ui/views/side_panel/side_panel_entry_id.h"
 #include "chrome/browser/ui/views/side_panel/side_panel_ui.h"
+#include "chrome/browser/ui/views/side_panel/third_party_llm/third_party_llm_panel_coordinator.h"
+#include "chrome/browser/ui/views/side_panel/clash_of_gpts/clash_of_gpts_coordinator.h"
 #include "chrome/browser/ui/web_applications/app_browser_controller.h"
 #include "chrome/browser/ui/web_applications/web_app_dialog_utils.h"
 #include "chrome/browser/ui/web_applications/web_app_launch_utils.h"
@@ -988,6 +990,33 @@ bool BrowserCommandController::ExecuteCommandWithDisposition(
       browser_->GetFeatures().side_panel_ui()->Show(
           SidePanelEntryId::kBookmarks, SidePanelOpenTrigger::kAppMenu);
       break;
+    case IDC_SHOW_THIRD_PARTY_LLM_SIDE_PANEL:
+      if (base::FeatureList::IsEnabled(features::kThirdPartyLlmPanel)) {
+        browser_->GetFeatures().side_panel_ui()->Toggle(
+            SidePanelEntry::Key(SidePanelEntryId::kThirdPartyLlm),
+            SidePanelOpenTrigger::kAppMenu);
+      }
+      break;
+    case IDC_CYCLE_THIRD_PARTY_LLM_PROVIDER:
+      if (base::FeatureList::IsEnabled(features::kThirdPartyLlmPanel)) {
+        if (ThirdPartyLlmPanelCoordinator* coordinator =
+                browser_->browser_window_features()
+                    ->third_party_llm_panel_coordinator()) {
+          coordinator->CycleProvider();
+        }
+      }
+      break;
+    case IDC_OPEN_CLASH_OF_GPTS:
+      if (base::FeatureList::IsEnabled(features::kClashOfGpts)) {
+        ClashOfGptsCoordinator* coordinator =
+            browser_->browser_window_features()->clash_of_gpts_coordinator();
+        // If not showing properly, close and recreate
+        if (!coordinator->IsShowing()) {
+          coordinator->Close();
+        }
+        coordinator->Show();
+      }
+      break;
     case IDC_SHOW_APP_MENU:
       base::RecordAction(base::UserMetricsAction("Accel_Show_App_Menu"));
       ShowAppMenu(browser_);
@@ -1648,6 +1677,12 @@ void BrowserCommandController::InitCommandState() {
   }
 
   command_updater_.UpdateCommandEnabled(IDC_SHOW_BOOKMARK_SIDE_PANEL, true);
+  command_updater_.UpdateCommandEnabled(IDC_SHOW_THIRD_PARTY_LLM_SIDE_PANEL,
+                                        base::FeatureList::IsEnabled(features::kThirdPartyLlmPanel));
+  command_updater_.UpdateCommandEnabled(IDC_CYCLE_THIRD_PARTY_LLM_PROVIDER,
+                                        base::FeatureList::IsEnabled(features::kThirdPartyLlmPanel));
+  command_updater_.UpdateCommandEnabled(IDC_OPEN_CLASH_OF_GPTS,
+                                        base::FeatureList::IsEnabled(features::kClashOfGpts));
 
   if (browser_->is_type_normal()) {
     // Reading list commands.
