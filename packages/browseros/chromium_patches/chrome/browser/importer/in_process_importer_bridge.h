diff --git a/chrome/browser/importer/in_process_importer_bridge.h b/chrome/browser/importer/in_process_importer_bridge.h
index 61190844025f0..4ff37f994d752 100644
--- a/chrome/browser/importer/in_process_importer_bridge.h
+++ b/chrome/browser/importer/in_process_importer_bridge.h
@@ -52,6 +52,8 @@ class InProcessImporterBridge : public ImporterBridge {
   void SetAutofillFormData(
       const std::vector<ImporterAutofillFormDataEntry>& entries) override;
 
+  void SetExtensions(const std::vector<std::string>& extension_ids) override;
+
   void NotifyStarted() override;
   void NotifyItemStarted(user_data_importer::ImportItem item) override;
   void NotifyItemEnded(user_data_importer::ImportItem item) override;
