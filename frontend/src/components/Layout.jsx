import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="d-flex flex-column vh-100">
      <Header />
      <div className="d-flex flex-grow-1 overflow-hidden">
        <Sidebar />
        <main className="content-wrapper flex-grow-1 p-4 overflow-auto">
          <div className="container-fluid">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
