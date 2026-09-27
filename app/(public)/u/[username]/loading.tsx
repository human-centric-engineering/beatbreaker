import { CommunityLoading } from '@/components/app/community/community-loading';

/** `/u/[username]` while their patterns are read. */
export default function Loading() {
  return <CommunityLoading label="Reading their patterns…" />;
}
