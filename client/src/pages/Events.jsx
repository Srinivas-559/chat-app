import { useState } from 'react';
import LoginForm from '../components/Events/LoginForm';
import CreateEventForm from '../components/Events/CreateEventForm';
import EventsDashboard from '../components/Events/EventsDashboard';

function Events() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <LoginForm onLogin={setUser} />;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <CreateEventForm user={user} />
      <EventsDashboard user={user} />
    </div>
  );
}

export default Events;
