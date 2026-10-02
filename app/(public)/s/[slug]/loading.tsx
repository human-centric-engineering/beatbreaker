import { CommunityLoading } from '@/components/app/community/community-loading';

/** `/s/[slug]` while the session is read. */
export default function Loading() {
  return <CommunityLoading label="Opening the session…" />;
}
