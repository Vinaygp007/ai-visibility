import { redirect } from "next/navigation";

// The v2 feature vote is hidden for now. FeatureVoteBoard is kept in
// components/ so it can be restored by rendering it here again.
export default function VotePage() {
  redirect("/scan");
}
