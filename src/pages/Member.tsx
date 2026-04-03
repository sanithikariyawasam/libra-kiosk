import { useLibrary, LibraryProvider } from "@/context/LibraryContext";
import LoginPage from "@/components/LoginPage";
import MainApp from "@/components/MainApp";

function MemberContent() {
  const { currentUser } = useLibrary();
  return currentUser ? <MainApp /> : <LoginPage />;
}

export default function Member() {
  return (
    <LibraryProvider>
      <MemberContent />
    </LibraryProvider>
  );
}
