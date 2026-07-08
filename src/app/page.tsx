import { getState } from "@/lib/profile-store";
import { SwitchyardApp } from "@/components/SwitchyardApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialState = await getState();
  return <SwitchyardApp initialState={initialState} />;
}
