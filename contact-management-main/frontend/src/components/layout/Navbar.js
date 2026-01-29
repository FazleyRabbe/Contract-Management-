import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiSettings,
  FiChevronDown,
  FiFileText,
  FiHome,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/helpers';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout, isAdmin, isClient, isProcurementManager, isLegalCounsel, isContractCoordinator } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Check if a link is active
  const isActiveLink = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get navigation links based on role
  const getNavLinks = () => {
    if (isAdmin) {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: FiHome },
        { to: '/contracts', label: 'Contracts', icon: FiFileText },
        { to: '/service-providers', label: 'Providers', icon: FiUsers },
        { to: '/admin/users', label: 'Users', icon: FiUsers },
      ];
    }
    if (isProcurementManager) {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: FiHome },
        { to: '/contracts', label: 'Procurement Review', icon: FiFileText },
      ];
    }
    if (isLegalCounsel) {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: FiHome },
        { to: '/contracts', label: 'Legal Review', icon: FiFileText },
      ];
    }
    if (isContractCoordinator) {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: FiHome },
        { to: '/contracts', label: 'Contracts', icon: FiFileText },
      ];
    }
    if (isClient) {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: FiHome },
        { to: '/contracts', label: 'My Contracts', icon: FiFileText },
        { to: '/service-providers', label: 'Providers', icon: FiUsers },
      ];
    }
    // Service provider or default
    return [
      { to: '/dashboard', label: 'Dashboard', icon: FiHome },
      { to: '/service-providers/my-requests', label: 'My Requests', icon: FiFileText },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">CM</span>
          <span className="logo-text">ContractManager</span>
        </Link>

        {/* Desktop Navigation */}
        {isAuthenticated && (
          <div className="navbar-links">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar-link ${isActiveLink(link.to) ? 'active' : ''}`}
              >
                <link.icon className="navbar-link-icon" />
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* User Menu */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="user-menu" ref={dropdownRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="user-avatar">
                  {getInitials(user?.firstName, user?.lastName)}
                </div>
                <span className="user-name">{user?.firstName}</span>
                <FiChevronDown
                  className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-user-info">
                      <span className="dropdown-user-name">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="dropdown-user-email">{user?.email}</span>
                      <span className="dropdown-user-role">{user?.role}</span>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <FiUser />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <FiSettings />
                    Settings
                  </Link>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <FiLogOut />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          {isAuthenticated && (
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="mobile-menu">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`mobile-menu-link ${isActiveLink(link.to) ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <link.icon />
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
