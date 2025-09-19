diff --git a/chrome/common/pref_names.h b/chrome/common/pref_names.h
index 0e898dc745b6e..12f83b0cc1ab5 100644
--- a/chrome/common/pref_names.h
+++ b/chrome/common/pref_names.h
@@ -1590,6 +1590,8 @@ inline constexpr char kImportDialogSavedPasswords[] =
     "import_dialog_saved_passwords";
 inline constexpr char kImportDialogSearchEngine[] =
     "import_dialog_search_engine";
+inline constexpr char kImportDialogExtensions[] =
+    "import_dialog_extensions";
 
 #if BUILDFLAG(IS_CHROMEOS)
 // Boolean controlling whether native client is force allowed by policy.
