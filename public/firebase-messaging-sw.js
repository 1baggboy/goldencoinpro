importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

// Fetch the config dynamically from our server endpoint
fetch('/api/firebase-config')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to fetch config, status: ${response.status}`);
    }
    return response.json();
  })
  .then(config => {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message:', payload);
      
      const title = payload.notification?.title || 'Notification';
      const options = {
        body: payload.notification?.body || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'transaction-notification',
        data: payload.data,
        vibrate: [200, 100, 200]
      };

      self.registration.showNotification(title, options);
    });
  })
  .catch(error => {
    console.error('[firebase-messaging-sw.js] Error fetching config or initializing:', error);
  });
