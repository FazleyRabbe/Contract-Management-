import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  FiFileText,
  FiDollarSign,
  FiCalendar,
  FiUsers,
  FiArrowLeft,
  FiSave,
  FiSend,
} from 'react-icons/fi';
import { contractAPI } from '../../services/api';
import { Button, Input, Select, Card, Spinner } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { CONTRACT_TYPES, VALIDATION, ROLES } from '../../utils/constants';
import { countWords } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './Contracts.css';

const schema = yup.object({
  title: yup
    .string()
    .required('Contract title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  contractType: yup.string().required('Contract type is required'),
  description: yup
    .string()
    .required('Description is required')
    .test(
      'word-count',
      `Description cannot exceed ${VALIDATION.DESCRIPTION_MAX_WORDS} words`,
      (value) => countWords(value) <= VALIDATION.DESCRIPTION_MAX_WORDS
    ),
  targetConditions: yup
    .string()
    .test(
      'word-count',
      `Target conditions cannot exceed ${VALIDATION.TARGET_CONDITIONS_MAX_WORDS} words`,
      (value) => !value || countWords(value) <= VALIDATION.TARGET_CONDITIONS_MAX_WORDS
    ),
  targetPersons: yup
    .number()
    .required('Target persons is required')
    .min(VALIDATION.MIN_TARGET_PERSONS, `Minimum ${VALIDATION.MIN_TARGET_PERSONS} person required`)
    .max(VALIDATION.MAX_TARGET_PERSONS, `Maximum ${VALIDATION.MAX_TARGET_PERSONS} persons allowed`),
  budgetMin: yup
    .number()
    .required('Minimum budget is required')
    .min(0, 'Budget cannot be negative'),
  budgetMax: yup
    .number()
    .required('Maximum budget is required')
    .min(0, 'Budget cannot be negative')
    .test('greater-than-min', 'Maximum must be >= minimum', function (value) {
      return value >= this.parent.budgetMin;
    }),
  startDate: yup
    .date()
    .required('Start date is required')
    .min(new Date(), 'Start date cannot be in the past'),
  endDate: yup
    .date()
    .required('End date is required')
    .min(yup.ref('startDate'), 'End date must be after start date'),
});

const ContractForm = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // Only clients can submit contracts for approval
  const canSubmitForApproval = user?.role === ROLES.CLIENT;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: '',
      contractType: '',
      description: '',
      targetConditions: '',
      targetPersons: 1,
      budgetMin: 0,
      budgetMax: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const description = watch('description');
  const targetConditions = watch('targetConditions');

  useEffect(() => {
    if (isEdit && id) {
      fetchContract();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const fetchContract = async () => {
    try {
      const response = await contractAPI.getById(id);
      const contract = response.data.data.contract;

      reset({
        title: contract.title,
        contractType: contract.contractType,
        description: contract.description,
        targetConditions: contract.targetConditions || '',
        targetPersons: contract.targetPersons,
        budgetMin: contract.budget.minimum,
        budgetMax: contract.budget.maximum,
        startDate: new Date(contract.startDate),
        endDate: new Date(contract.endDate),
      });
    } catch (error) {
      toast.error('Failed to load contract');
      navigate('/contracts');
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data, submitForApproval = false) => {
    setLoading(true);

    const contractData = {
      title: data.title,
      contractType: data.contractType,
      description: data.description,
      targetConditions: data.targetConditions,
      targetPersons: data.targetPersons,
      budget: {
        minimum: data.budgetMin,
        maximum: data.budgetMax,
        currency: 'EUR',
      },
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    };

    try {
      let contractId = id;

      if (isEdit) {
        await contractAPI.update(id, contractData);
        toast.success('Contract updated successfully');
      } else {
        const response = await contractAPI.create(contractData);
        contractId = response.data.data.contract._id;
        toast.success('Contract created successfully');
      }

      if (submitForApproval) {
        await contractAPI.submit(contractId);
        toast.success('Contract submitted for approval');
      }

      navigate(`/contracts/${contractId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = handleSubmit((data) => onSubmit(data, false));
  const handleSubmitForApproval = handleSubmit((data) => onSubmit(data, true));

  if (fetching) {
    return (
      <div className="contract-form-loading">
        <Spinner size="lg" />
        <p>Loading contract...</p>
      </div>
    );
  }

  return (
    <div className="contract-form-page">
      <div className="page-header">
        <div className="page-header-content">
          <Button
            variant="ghost"
            size="sm"
            icon={<FiArrowLeft />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <h1>{isEdit ? 'Edit Contract' : 'Create New Contract'}</h1>
          <p>
            {isEdit
              ? 'Update the contract details below'
              : 'Fill in the details to create a new contract'}
          </p>
        </div>
      </div>

      <form className="contract-form">
        <div className="form-grid">
          {/* Basic Information */}
          <Card className="form-section">
            <Card.Header>
              <h3>
                <FiFileText /> Basic Information
              </h3>
            </Card.Header>
            <Card.Body>
              <Input
                label="Contract Title"
                placeholder="Enter contract title"
                error={errors.title?.message}
                required
                {...register('title')}
              />

              <Select
                label="Contract Type"
                options={CONTRACT_TYPES}
                placeholder="Select contract type"
                error={errors.contractType?.message}
                required
                {...register('contractType')}
              />

              <div className="form-group">
                <label className="form-label">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  className={`form-textarea ${errors.description ? 'error' : ''}`}
                  placeholder="Describe the contract requirements..."
                  rows={5}
                  {...register('description')}
                />
                <div className="textarea-footer">
                  {errors.description && (
                    <span className="form-error">{errors.description.message}</span>
                  )}
                  <span className="word-count">
                    {countWords(description)}/{VALIDATION.DESCRIPTION_MAX_WORDS} words
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Conditions</label>
                <textarea
                  className={`form-textarea ${errors.targetConditions ? 'error' : ''}`}
                  placeholder="Specify target conditions..."
                  rows={4}
                  {...register('targetConditions')}
                />
                <div className="textarea-footer">
                  {errors.targetConditions && (
                    <span className="form-error">{errors.targetConditions.message}</span>
                  )}
                  <span className="word-count">
                    {countWords(targetConditions)}/{VALIDATION.TARGET_CONDITIONS_MAX_WORDS} words
                  </span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Requirements */}
          <Card className="form-section">
            <Card.Header>
              <h3>
                <FiUsers /> Requirements
              </h3>
            </Card.Header>
            <Card.Body>
              <div className="form-group">
                <label className="form-label">
                  Target Persons <span className="required">*</span>
                </label>
                <div className="number-input-wrapper">
                  <input
                    type="number"
                    className={`form-input ${errors.targetPersons ? 'error' : ''}`}
                    min={VALIDATION.MIN_TARGET_PERSONS}
                    max={VALIDATION.MAX_TARGET_PERSONS}
                    {...register('targetPersons')}
                  />
                  <span className="input-hint">
                    {VALIDATION.MIN_TARGET_PERSONS}-{VALIDATION.MAX_TARGET_PERSONS} persons
                  </span>
                </div>
                {errors.targetPersons && (
                  <span className="form-error">{errors.targetPersons.message}</span>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Budget */}
          <Card className="form-section">
            <Card.Header>
              <h3>
                <FiDollarSign /> Budget (EUR)
              </h3>
            </Card.Header>
            <Card.Body>
              <div className="budget-inputs">
                <div className="form-group">
                  <label className="form-label">
                    Minimum Budget <span className="required">*</span>
                  </label>
                  <div className="currency-input">
                    <span className="currency-symbol">€</span>
                    <input
                      type="number"
                      className={`form-input ${errors.budgetMin ? 'error' : ''}`}
                      min={0}
                      step={100}
                      {...register('budgetMin')}
                    />
                  </div>
                  {errors.budgetMin && (
                    <span className="form-error">{errors.budgetMin.message}</span>
                  )}
                </div>

                <div className="budget-separator">-</div>

                <div className="form-group">
                  <label className="form-label">
                    Maximum Budget <span className="required">*</span>
                  </label>
                  <div className="currency-input">
                    <span className="currency-symbol">€</span>
                    <input
                      type="number"
                      className={`form-input ${errors.budgetMax ? 'error' : ''}`}
                      min={0}
                      step={100}
                      {...register('budgetMax')}
                    />
                  </div>
                  {errors.budgetMax && (
                    <span className="form-error">{errors.budgetMax.message}</span>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Timeline */}
          <Card className="form-section">
            <Card.Header>
              <h3>
                <FiCalendar /> Timeline
              </h3>
            </Card.Header>
            <Card.Body>
              <div className="date-inputs">
                <div className="form-group">
                  <label className="form-label">
                    Start Date <span className="required">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <DatePicker
                        selected={field.value}
                        onChange={field.onChange}
                        minDate={new Date()}
                        dateFormat="MMM dd, yyyy"
                        className={`form-input date-picker ${errors.startDate ? 'error' : ''}`}
                        placeholderText="Select start date"
                      />
                    )}
                  />
                  {errors.startDate && (
                    <span className="form-error">{errors.startDate.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    End Date <span className="required">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="endDate"
                    render={({ field }) => (
                      <DatePicker
                        selected={field.value}
                        onChange={field.onChange}
                        minDate={watch('startDate') || new Date()}
                        dateFormat="MMM dd, yyyy"
                        className={`form-input date-picker ${errors.endDate ? 'error' : ''}`}
                        placeholderText="Select end date"
                      />
                    )}
                  />
                  {errors.endDate && (
                    <span className="form-error">{errors.endDate.message}</span>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Cancel
          </Button>
          <div className="form-actions-right">
            {canSubmitForApproval ? (
              <>
                <Button
                  variant="outline"
                  icon={<FiSave />}
                  onClick={handleSave}
                  loading={loading}
                  disabled={!isDirty}
                >
                  Save as Draft
                </Button>
                <Button
                  icon={<FiSend />}
                  onClick={handleSubmitForApproval}
                  loading={loading}
                >
                  {isEdit ? 'Save & Submit' : 'Create & Submit'}
                </Button>
              </>
            ) : (
              <Button
                icon={<FiSave />}
                onClick={handleSave}
                loading={loading}
              >
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ContractForm;
