import { CommunityLoading } from '@/components/app/community/community-loading';

/** `/drummers/[slug]` while the record is read. */
export default function Loading() {
  return <CommunityLoading label="Reading the record…" />;
}
