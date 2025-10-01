// supabase/functions/finnhub-proxy/_types.d.ts
// Minimal typings so the Expo/TS compiler stops complaining.
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get(k: string): string | undefined;
  };
};
