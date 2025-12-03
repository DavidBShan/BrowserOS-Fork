diff --git a/chrome/utility/importer/external_process_importer_bridge.h b/chrome/utility/importer/external_process_importer_bridge.h
index 2f36e248431a3..859fb9a9b9f9a 100644
--- a/chrome/utility/importer/external_process_importer_bridge.h
+++ b/chrome/utility/importer/external_process_importer_bridge.h
@@ -65,6 +65,8 @@ class ExternalProcessImporterBridge : public ImporterBridge {
   void SetAutofillFormData(
       const std::vector<ImporterAutofillFormDataEntry>& entries) override;
 
+  void SetExtensions(const std::vector<std::string>& extension_ids) override;
+
   void NotifyStarted() override;
   void NotifyItemStarted(user_data_importer::ImportItem item) override;
   void NotifyItemEnded(user_data_importer::ImportItem item) override;
