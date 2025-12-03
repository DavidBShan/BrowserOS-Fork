diff --git a/chrome/browser/importer/external_process_importer_client.h b/chrome/browser/importer/external_process_importer_client.h
index 42b466d3ce66b..ac4eb6f666682 100644
--- a/chrome/browser/importer/external_process_importer_client.h
+++ b/chrome/browser/importer/external_process_importer_client.h
@@ -81,6 +81,8 @@ class ExternalProcessImporterClient
   void OnAutofillFormDataImportGroup(
       const std::vector<ImporterAutofillFormDataEntry>&
           autofill_form_data_entry_group) override;
+  void OnExtensionsImportReady(
+      const std::vector<std::string>& extension_ids) override;
 
  protected:
   ~ExternalProcessImporterClient() override;
