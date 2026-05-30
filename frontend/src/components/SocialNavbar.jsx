import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchNotifications, searchUsers } from "../services/socialApi";

function SocialNavbar({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      try {
        const data = await searchUsers(query.trim());
        setResults(data.users || []);
      } catch (error) {
        setResults([]);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await fetchNotifications();
        setNotifications(data.notifications || []);
      } catch (error) {
        setNotifications([]);
      }
    };

    if (currentUser?.id) {
      loadNotifications();
    }
  }, [currentUser?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const goToProfile = () => {
    if (currentUser?.id) {
      navigate(`/profile/${currentUser.id}`);
    }
  };

  const activeFeed = location.pathname.startsWith("/feed");
  const activeProfile = location.pathname.startsWith("/profile");

  return (
    <>
      <header className="social-navbar">
        <div className="social-brand" onClick={() => navigate("/feed")} role="button" tabIndex={0}>
          <span className="social-brand-mark">S</span>
          <div>
            <strong>SocialFeed</strong>
            <small>modern social layer</small>
          </div>
        </div>

        <div className={`social-search ${searchOpen ? "social-search-open" : ""}`}>
          <input
            type="search"
            placeholder="Search people by username"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
          />

          {searchOpen && results.length > 0 && (
            <div className="social-search-results">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="social-search-result"
                  onMouseDown={() => navigate(`/profile/${user.id}`)}
                >
                  <img
                    src={user.profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"}
                    alt={user.username}
                  />
                  <div>
                    <strong>{user.username}</strong>
                    <small>{user.followers_count || 0} followers</small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="social-navbar-actions">
          <button type="button" className={`navbar-icon-button ${notificationsOpen ? "active" : ""}`} onClick={() => setNotificationsOpen((state) => !state)}>
            Notifications {unreadCount > 0 ? <span className="badge-dot">{unreadCount}</span> : null}
          </button>
          <button type="button" className="navbar-icon-button" onClick={() => document.getElementById("compose-post")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Create
          </button>
          <button type="button" className={`navbar-avatar-button ${activeProfile ? "active" : ""}`} onClick={goToProfile}>
            <img
              src={currentUser?.profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"}
              alt="Current user"
            />
          </button>
          <button type="button" className="logout-chip" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {notificationsOpen && (
        <section className="notification-panel">
          <header>
            <strong>Notifications</strong>
            <small>{notifications.length} recent updates</small>
          </header>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p>No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <article key={notification.id} className={`notification-item ${notification.is_read ? "is-read" : ""}`}>
                  <img src={notification.actor_profile_pic || "https://ui-avatars.com/api/?name=User&background=0f172a&color=fff"} alt="Actor" />
                  <div>
                    <strong>{notification.actor_username || "Someone"}</strong>
                    <p>
                      {notification.type === "like" && "liked your post"}
                      {notification.type === "comment" && "commented on your post"}
                      {notification.type === "reply" && "replied to a comment"}
                      {notification.type === "follow" && "started following you"}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      <nav className="social-bottom-nav">
        <button type="button" className={activeFeed ? "active" : ""} onClick={() => navigate("/feed")}>Home</button>
        <button type="button" onClick={() => setSearchOpen(true)}>Search</button>
        <button type="button" onClick={() => document.getElementById("compose-post")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Post</button>
        <button type="button" onClick={() => setNotificationsOpen((state) => !state)}>Alerts</button>
        <button type="button" className={activeProfile ? "active" : ""} onClick={goToProfile}>Profile</button>
      </nav>
    </>
  );
}

export default SocialNavbar;