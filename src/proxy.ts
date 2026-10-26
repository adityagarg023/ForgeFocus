import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|ttc|otf|woff2?|ico|csv|txt|pdf|map|bmp|webm|m4a|mp4|avi|mov|zip|gz|mp3|wav)).*)",
    "/(api|trpc)(.*)",
  ],
};
