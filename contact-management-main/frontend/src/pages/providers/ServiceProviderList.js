import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiSearch,
  FiFilter,
  FiStar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { serviceProviderAPI } from '../../services/api';
import { Card, Badge, Spinner, Button, Select } from '../../components/common';
import { debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './Providers.css';

const ServiceProviderList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    minRating: searchParams.get('minRating') || '',
    availability: searchParams.get('availability') || '',
  });

  const [showFilters, setShowFilters] = useState(false);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.minRating && { minRating: filters.minRating }),
        ...(filters.availability && { availability: filters.availability }),
        sort: '-rating.average',
      };

      const response = await serviceProviderAPI.getAll(params);
      setProviders(response.data.data);
      setPagination((prev) => ({
        ...prev,
        ...response.data.pagination,
      }));
    } catch (error) {
      toast.error('Failed to load service providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters.minRating, filters.availability]);

  // Debounced search
  const debouncedSearch = useCallback(
    () => debounce(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchProviders();
    }, 500)(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSearchChange = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
    debouncedSearch();
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));

    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const ratingOptions = [
    { value: '4', label: '4+ Stars' },
    { value: '3', label: '3+ Stars' },
    { value: '2', label: '2+ Stars' },
  ];

  const availabilityOptions = [
    { value: 'available', label: 'Available' },
    { value: 'busy', label: 'Busy' },
    { value: 'unavailable', label: 'Unavailable' },
  ];

  return (
    <div className="providers-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1>Service Providers</h1>
          <p>Find and connect with skilled service providers</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="filters-card">
        <div className="filters-row">
          <div className="search-input">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search providers by name, role, or expertise..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>

          <Button
            variant="secondary"
            icon={<FiFilter />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="filters-expanded">
            <Select
              placeholder="Minimum Rating"
              options={ratingOptions}
              value={filters.minRating}
              onChange={(e) => handleFilterChange('minRating', e.target.value)}
            />
            <Select
              placeholder="Availability"
              options={availabilityOptions}
              value={filters.availability}
              onChange={(e) => handleFilterChange('availability', e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({ search: '', minRating: '', availability: '' });
                setSearchParams({});
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Providers Grid */}
      {loading ? (
        <div className="providers-loading">
          <Spinner size="lg" />
          <p>Loading providers...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="providers-empty">
          <p>No service providers found</p>
        </div>
      ) : (
        <>
          <div className="providers-grid">
            {providers.map((provider) => (
              <Link
                key={provider._id}
                to={`/service-providers/${provider._id}`}
                className="provider-card-link"
              >
                <Card className="provider-card-full" hoverable>
                  <div className="provider-card-header">
                    <div className="provider-avatar-large">
                      {provider.user?.firstName?.charAt(0)}
                      {provider.user?.lastName?.charAt(0)}
                    </div>
                    {provider.isVerified && (
                      <Badge variant="success" size="sm">
                        <FiCheckCircle /> Verified
                      </Badge>
                    )}
                  </div>

                  <div className="provider-card-content">
                    <h3 className="provider-name">
                      {provider.user?.firstName} {provider.user?.lastName}
                    </h3>
                    {provider.companyName && (
                      <p className="provider-company">{provider.companyName}</p>
                    )}
                    <p className="provider-role">{provider.coreRole}</p>

                    <div className="provider-stats-row">
                      <div className="provider-rating-large">
                        <FiStar className="star-icon" />
                        <span className="rating-value">
                          {provider.rating?.average?.toFixed(1) || '0.0'}
                        </span>
                        <span className="rating-count">
                          ({provider.rating?.count || 0})
                        </span>
                      </div>
                      <span className="provider-tasks">
                        {provider.completedTasks} tasks completed
                      </span>
                    </div>

                    {provider.expertise?.length > 0 && (
                      <div className="provider-expertise">
                        {provider.expertise.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="gray" size="sm">
                            {skill}
                          </Badge>
                        ))}
                        {provider.expertise.length > 3 && (
                          <span className="more-skills">
                            +{provider.expertise.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {provider.hourlyRate?.min && (
                      <div className="provider-rate">
                        €{provider.hourlyRate.min} - €{provider.hourlyRate.max}/hr
                      </div>
                    )}

                    <Badge
                      variant={
                        provider.availability === 'available'
                          ? 'success'
                          : provider.availability === 'busy'
                          ? 'warning'
                          : 'gray'
                      }
                      size="sm"
                    >
                      {provider.availability}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="providers-pagination">
            <div className="pagination-info">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} providers
            </div>
            <div className="pagination-controls">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrevPage}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                <FiChevronLeft />
              </Button>
              <span className="pagination-pages">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                <FiChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ServiceProviderList;
