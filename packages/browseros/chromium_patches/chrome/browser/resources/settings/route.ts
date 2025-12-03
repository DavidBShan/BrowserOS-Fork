diff --git a/chrome/browser/resources/settings/route.ts b/chrome/browser/resources/settings/route.ts
index 1fd9c83cb74e7..d4f3e7c9f3df8 100644
--- a/chrome/browser/resources/settings/route.ts
+++ b/chrome/browser/resources/settings/route.ts
@@ -165,6 +165,9 @@ function createRoutes(): SettingsRoutes {
 
   // Root page.
   r.BASIC = new Route('/');
+  r.NXTSCAPE = new Route('/browseros-ai', 'BrowserOS AI Settings');
+  r.BROWSEROS = new Route('/browseros', 'BrowserOS');
+  r.BROWSEROS_PREFS = new Route('/browseros-settings', 'BrowserOS Settings');
 
   r.ABOUT = r.BASIC.createSection(
       '/help', 'about', loadTimeData.getString('aboutPageTitle'));
