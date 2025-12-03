diff --git a/chrome/browser/importer/profile_writer.h b/chrome/browser/importer/profile_writer.h
index f609d99dde302..7d0a074c0da2c 100644
--- a/chrome/browser/importer/profile_writer.h
+++ b/chrome/browser/importer/profile_writer.h
@@ -92,6 +92,9 @@ class ProfileWriter : public base::RefCountedThreadSafe<ProfileWriter> {
   virtual void AddAutocompleteFormDataEntries(
       const std::vector<autofill::AutocompleteEntry>& autocomplete_entries);
 
+  // Adds the imported extensions to the profile.
+  virtual void AddExtensions(const std::vector<std::string>& extension_ids);
+
  protected:
   friend class base::RefCountedThreadSafe<ProfileWriter>;
 
