import { useState } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import ListView from './components/ListView';
import CalendarView from './components/CalendarView';
import AddApartmentModal from './components/AddApartmentModal';
import PasswordModal from './components/PasswordModal';
import { useApartments } from './hooks/useApartments';
import { useAuth } from './hooks/useAuth';
import { useComments } from './hooks/useComments';
import { Apartment, AppView } from './types';

export default function App() {
  const { isOwner, checkPassword, login, logout } = useAuth();
  const { comments, addComment, deleteComment } = useComments();

  const [view, setView]                   = useState<AppView>('map');
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingApartment, setEditingApartment]   = useState<Apartment | null>(null);

  const { apartments, loading, addApartment, updateApartment, deleteApartment } = useApartments();

  const handleEdit = (apt: Apartment) => {
    setEditingApartment(apt);
    setShowAddModal(true);
  };

  const handleSave = async (data: Omit<Apartment, 'id' | 'createdAt'>) => {
    if (editingApartment) {
      await updateApartment(editingApartment.id, data);
    } else {
      await addApartment(data);
    }
  };

  const handleSetView = (v: AppView) => {
    setView(v);
    if (v === 'map') setPanelExpanded(false);
  };

  const panelOpen = view !== 'map';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Header
        view={view}
        onSetView={handleSetView}
        onAddApartment={() => { setEditingApartment(null); setShowAddModal(true); }}
        apartmentCount={apartments.length}
        isOwner={isOwner}
        onOwnerClick={() => isOwner ? logout() : setShowPasswordModal(true)}
      />

      <main className="flex-1 overflow-hidden relative">
        <div
          className="absolute inset-0"
          style={{ opacity: loading ? 0.4 : 1, transition: 'opacity 0.2s' }}
        >
          <MapView
            apartments={apartments}
            onEdit={handleEdit}
            onDelete={deleteApartment}
            showList={panelOpen}
            listExpanded={panelExpanded}
            isOwner={isOwner}
            comments={comments}
            onAddComment={addComment}
            onDeleteComment={deleteComment}
          />
        </div>

        <ListView
          apartments={apartments}
          onEdit={handleEdit}
          onDelete={deleteApartment}
          show={view === 'list'}
          isExpanded={panelExpanded}
          onClose={() => { setView('map'); setPanelExpanded(false); }}
          onToggleExpand={() => setPanelExpanded(v => !v)}
          isOwner={isOwner}
          comments={comments}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
        />

        {isOwner && (
          <CalendarView
            apartments={apartments}
            onEdit={handleEdit}
            show={view === 'calendar'}
            isExpanded={panelExpanded}
            onClose={() => { setView('map'); setPanelExpanded(false); }}
            onToggleExpand={() => setPanelExpanded(v => !v)}
          />
        )}
      </main>

      {isOwner && showAddModal && (
        <AddApartmentModal
          onClose={() => { setShowAddModal(false); setEditingApartment(null); }}
          onSave={handleSave}
          editingApartment={editingApartment}
        />
      )}

      {showPasswordModal && (
        <PasswordModal
          onSuccess={login}
          onClose={() => setShowPasswordModal(false)}
          checkPassword={checkPassword}
        />
      )}
    </div>
  );
}
