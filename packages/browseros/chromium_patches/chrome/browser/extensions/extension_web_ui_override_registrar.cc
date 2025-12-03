diff --git a/chrome/browser/extensions/extension_web_ui_override_registrar.cc b/chrome/browser/extensions/extension_web_ui_override_registrar.cc
index 7b48bcb950bad..4e7750c2a6112 100644
--- a/chrome/browser/extensions/extension_web_ui_override_registrar.cc
+++ b/chrome/browser/extensions/extension_web_ui_override_registrar.cc
@@ -6,7 +6,9 @@
 
 #include "base/functional/bind.h"
 #include "base/lazy_instance.h"
+#include "base/logging.h"
 #include "base/one_shot_event.h"
+#include "chrome/browser/extensions/browseros_extension_constants.h"
 #include "chrome/browser/extensions/extension_web_ui.h"
 #include "chrome/browser/profiles/profile.h"
 #include "extensions/browser/extension_system.h"
@@ -32,15 +34,29 @@ ExtensionWebUIOverrideRegistrar::~ExtensionWebUIOverrideRegistrar() = default;
 void ExtensionWebUIOverrideRegistrar::OnExtensionLoaded(
     content::BrowserContext* browser_context,
     const Extension* extension) {
-  const URLOverrides::URLOverrideMap& overrides =
+  // Check if this extension has Chrome URL overrides
+  URLOverrides::URLOverrideMap overrides =
       URLOverrides::GetChromeURLOverrides(extension);
-  ExtensionWebUI::RegisterOrActivateChromeURLOverrides(
-      Profile::FromBrowserContext(browser_context), overrides);
+
   if (!overrides.empty()) {
-    for (auto& observer : observer_list_) {
-      observer.OnExtensionOverrideAdded(*extension);
+    // Check if this is a BrowserOS extension
+    bool is_browseros_extension = false;
+    for (const char* allowed_id : browseros::kAllowedExtensions) {
+      if (extension->id() == allowed_id) {
+        is_browseros_extension = true;
+        break;
+      }
+    }
+
+    if (!is_browseros_extension) {
+      // disable other extensions from overriding Chrome URLs
+      return;
     }
   }
+
+  ExtensionWebUI::RegisterOrActivateChromeURLOverrides(
+      Profile::FromBrowserContext(browser_context),
+      overrides);
 }
 
 void ExtensionWebUIOverrideRegistrar::OnExtensionUnloaded(
