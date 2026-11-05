import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { Spinner } from "@/components/app/ui-bits";

// Session-aware entry: signed-in users go to the main menu, others to sign-in.
export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "هدهد الفواتير — إرسال رسائل الفواتير" },
      { name: "description", content: "جهّز قوالب الرسائل واربط خدمة الإرسال وأرسل فواتيرك لمشتركيك دفعة واحدة." },
      { property: "og:title", content: "هدهد الفواتير" },
      { property: "og:description", content: "أرسل رسائل الفواتير لمشتركيك بخطوات بسيطة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/home" : "/auth", replace: true });
  },
  component: () => (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  ),
});
