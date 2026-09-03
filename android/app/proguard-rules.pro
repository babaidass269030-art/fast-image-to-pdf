# ProGuard Rules for Fast PDF & Start.io
-keepattributes Exceptions, InnerClasses, Signature, Deprecated, SourceFile, LineNumberTable, *Annotation*, EnclosingMethod
-dontwarn android.webkit.JavascriptInterface

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.fastimage.pdf.MainActivity { *; }
-keep class com.fastimage.pdf.MainActivity$* { *; }
-keep class androidx.core.content.FileProvider { *; }

# Start.io SDK
-keep class com.startapp.** {
    *;
}
-dontwarn com.startapp.**

