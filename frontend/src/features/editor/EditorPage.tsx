import { useParams } from 'react-router';
import { useEntry } from '@/api/entries';
import { LinkButton, LoadingLine } from '@/design';
import { RequireOwner } from '@/features/auth/RequireOwner';
import { useDocumentTitle } from '@/lib/hooks';
import { WritingRoom } from './WritingRoom';

/** /desk/write/:id: loads the entry once, then hands it to the writing room (which owns all edits). */
export function EditorPage() {
  return (
    <RequireOwner>
      <Loader />
    </RequireOwner>
  );
}

function Loader() {
  const { id } = useParams();
  const { data, isPending, error } = useEntry(id);
  useDocumentTitle(data ? data.title || 'Untitled' : 'Writing');
  if (isPending) return <LoadingLine className="fixed inset-x-0 top-0" label="Opening the entry" />;
  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-start justify-center gap-8 px-(--gutter)">
        <h1 className="text-h1">This entry could not be opened.</h1>
        <LinkButton to="/desk">Back to the Desk</LinkButton>
      </main>
    );
  }
  return <WritingRoom key={data.id} entry={data} />;
}
