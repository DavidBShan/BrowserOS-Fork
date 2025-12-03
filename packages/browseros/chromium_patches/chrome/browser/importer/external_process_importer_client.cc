diff --git a/chrome/browser/importer/external_process_importer_client.cc b/chrome/browser/importer/external_process_importer_client.cc
index 6ee7a959fde3e..705f24f133755 100644
--- a/chrome/browser/importer/external_process_importer_client.cc
+++ b/chrome/browser/importer/external_process_importer_client.cc
@@ -251,6 +251,14 @@ void ExternalProcessImporterClient::OnAutofillFormDataImportGroup(
     bridge_->SetAutofillFormData(autofill_form_data_);
 }
 
+void ExternalProcessImporterClient::OnExtensionsImportReady(
+    const std::vector<std::string>& extension_ids) {
+  if (cancelled_)
+    return;
+
+  bridge_->SetExtensions(extension_ids);
+}
+
 ExternalProcessImporterClient::~ExternalProcessImporterClient() = default;
 
 void ExternalProcessImporterClient::Cleanup() {
