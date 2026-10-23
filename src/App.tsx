import { useState } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import ListView from './components/ListView';
import CalendarView from './components/CalendarView';
import AddApartmentModal from './components/AddApartmentModal';
import AuthModal from './components/AuthModal';
import { useApartments } from './hooks/useApartments';
import { useBlockedSlots } from './hooks/useBlockedSlots';
import { isOwnerSession, setOwnerSession } from './lib/auth';
import { Apartment, AppView } from './types';

export default function App() {
  const [view, setView]                   = useState<AppView>('map');
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isOwner, setIsOwner]             = useState(isOwnerSession);
  const [focusAptId, setFocusAptId]       = useState<string | null>(null);
  const [showArchived, setShowArchived]   = useState(false);

  const { apartments, loading, addApartment, updateApartment, deleteApartment } = useApartments();
  const visibleApartments  = showArchived ? apartments : apartments.filter(a => !a.archived);
  const calendarApartments = apartments.filter(a => !a.archived || a.tourStatus === 'toured');
  const { blockedSlots, addBlockedSlot, deleteBlockedSlot } = useBlockedSlots();

  const handleEdit = (apt: Apartment) => {
    if (!isOwner) return;
    setEditingApartment(apt);
    setShowAddModal(true);
  };

  const handleSave = async (data: Omit<Apartment, 'id' | 'createdAt'>) => {
    if (!isOwner) return;
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

  const handleAuthClick = () => {
    if (isOwner) {
      setOwnerSession(false);
      setIsOwner(false);
      // Drop back to map if on calendar (owner-only)
      if (view === 'calendar') setView('map');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsOwner(true);
    setShowAuthModal(false);
  };

  const panelOpen = view !== 'map';

  return (
    <div className="flex flex-col overflow-hidden" style={{ background: 'var(--bg)', height: '100dvh' }}>
      <Header
        view={view}
        onSetView={handleSetView}
        onAddApartment={() => { setEditingApartment(null); setShowAddModal(true); }}
        apartmentCount={apartments.length}
        isOwner={isOwner}
        onAuthClick={handleAuthClick}
      />

      <main className="flex-1 overflow-hidden relative">
        <div
          className="absolute inset-0"
          style={{ opacity: loading ? 0.4 : 1, transition: 'opacity 0.2s' }}
        >
          <MapView
            apartments={visibleApartments}
            onEdit={handleEdit}
            onDelete={isOwner ? deleteApartment : () => {}}
            onUpdate={updateApartment}
            onArchive={id => updateApartment(id, { archived: true })}
            showList={panelOpen}
            listExpanded={panelExpanded}
            isOwner={isOwner}
            focusApartmentId={focusAptId}
            onFocusHandled={() => setFocusAptId(null)}
            showArchived={showArchived}
            onToggleShowArchived={() => setShowArchived(v => !v)}
          />
        </div>

        <ListView
          apartments={visibleApartments}
          onEdit={handleEdit}
          onDelete={isOwner ? deleteApartment : () => {}}
          onArchive={id => updateApartment(id, { archived: true })}
          onToggleFavorite={apt => updateApartment(apt.id, { favorited: !apt.favorited })}
          onUpdate={updateApartment}
          onFocusApartment={apt => setFocusAptId(apt.id)}
          show={view === 'list'}
          isExpanded={panelExpanded}
          onClose={() => { setView('map'); setPanelExpanded(false); }}
          onToggleExpand={() => setPanelExpanded(v => !v)}
          isOwner={isOwner}
        />

        {isOwner && (
          <CalendarView
            apartments={calendarApartments}
            onEdit={handleEdit}
            onFocusApartment={apt => setFocusAptId(apt.id)}
            blockedSlots={blockedSlots}
            onAddBlockedSlot={addBlockedSlot}
            onDeleteBlockedSlot={deleteBlockedSlot}
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

      {showAuthModal && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
