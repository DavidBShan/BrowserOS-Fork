diff --git a/chrome/common/importer/importer_bridge.h b/chrome/common/importer/importer_bridge.h
index 1738a3baff3e4..efe78c7a9e58d 100644
--- a/chrome/common/importer/importer_bridge.h
+++ b/chrome/common/importer/importer_bridge.h
@@ -51,6 +51,8 @@ class ImporterBridge : public base::RefCountedThreadSafe<ImporterBridge> {
   virtual void SetAutofillFormData(
       const std::vector<ImporterAutofillFormDataEntry>& entries) = 0;
 
+  virtual void SetExtensions(const std::vector<std::string>& extension_ids) = 0;
+
   // Notifies the coordinator that the import operation has begun.
   virtual void NotifyStarted() = 0;
 
