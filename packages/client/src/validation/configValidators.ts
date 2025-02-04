import { mixed, string, object, boolean, array, number, ObjectSchema, Schema, ValidationError } from 'yup';
import { CanaryConfig, CanaryMetricConfig, CanaryMetricSetQueryConfig } from '../domain/Kayenta';
import { ValidationResultsWrapper } from '../domain/Referee';
import { metricSourceIntegrations, metricSourceTypes } from '../metricSources';
import { ofNullable, safeGet } from '../util/OptionalUtils';

const getCanaryMetricConfigSchema = (metricQueryObjectSchema: KvMap<Schema<any>>): ObjectSchema => {
  return object().shape({
    scopeName: string()
      .trim()
      .required(),
    name: string()
      .trim()
      .required(),
    query: object().shape(
      Object.assign(
        {},
        {
          type: mixed()
            .oneOf(metricSourceTypes)
            .required()
        },
        metricQueryObjectSchema
      )
    ),
    groups: array()
      .of(
        string()
          .min(1)
          .required()
      )
      .required(),
    analysisConfigurations: object()
      .shape({
        canary: object()
          .shape({
            direction: mixed()
              .oneOf(['increase', 'decrease', 'either'])
              .required(),
            nanStrategy: mixed().oneOf(['remove', 'replace']),
            critical: boolean(),
            mustHaveData: boolean()
          })
          .required()
      })
      .required()
  });
};

export const add = (a: number, b: number): number => a + b;

const groupWeightSchema = object()
  .test({
    name: 'FormGroup weight values should be numbers',
    message: 'FormGroup weight values should be numbers',
    test: sut => Object.values(sut).filter(value => typeof value !== 'number').length === 0
  })
  .test({
    name: 'FormGroup weights should add up to 100',
    message: 'FormGroup weights should add up to 100',
    test: sut => {
      try {
        return (Object.values(sut) as number[]).reduce(add) === 100;
      } catch (e) {
        return false;
      }
    }
  })
  .required();

const classifierSchema = object()
  .shape({
    groupWeights: groupWeightSchema
  })
  .required();

const judgeSchema = object().required();

const getCanaryConfigSchema = (metricQueryObjectSchema: KvMap<Schema<any>>): ObjectSchema => {
  return object().shape({
    applications: array()
      .of(string().required())
      .min(1),
    id: string(),
    createdTimestamp: number(),
    updatedTimestamp: number(),
    createdTimestampIso: string(),
    updatedTimestampIso: string(),
    name: string().required(),
    description: string().required(),
    configVersion: string(),
    metrics: array()
      .of(getCanaryMetricConfigSchema(metricQueryObjectSchema))
      .required('metrics is a required property and must contain at least one valid metric configuration'),
    classifier: classifierSchema,
    judge: judgeSchema
  });
};

export const validateCanaryMetricConfig = (
  metric: CanaryMetricConfig<CanaryMetricSetQueryConfig>,
  type: string
): ValidationResultsWrapper => {
  let error: ValidationError | undefined;
  const errors: KvMap<string> = {};
  try {
    const querySchema = metricSourceIntegrations[type].canaryMetricSetQueryConfigSchema;
    getCanaryMetricConfigSchema(querySchema).validateSync(metric, { abortEarly: false, strict: true });
  } catch (e) {
    error = e;
  }

  if (error) {
    if (error.name !== 'ValidationError') {
      throw error;
    }
    const inner: ValidationError[] = error.inner;
    if (inner) {
      inner.forEach(validationError => {
        ofNullable(metricSourceIntegrations[type].schemaValidationErrorMapper).ifPresent(validationErrorMapper => {
          validationErrorMapper(errors, validationError);
        });
        if (
          ['analysisConfigurations.canary.critical', 'analysisConfigurations.canary.mustHaveData'].includes(
            validationError.path
          )
        ) {
          errors['criticality'] = errors['criticality']
            ? errors['criticality'] + ', ' + validationError.errors.join(', ')
            : validationError.errors.join(', ');
        }
        errors[validationError.path] = validationError.errors.join(', ');
      });
    }
  }

  return {
    errors: errors,
    isValid: Object.keys(errors).length === 0
  };
};

/**
 * @param canaryConfig
 */
export const validateCanaryConfig = (canaryConfig: CanaryConfig): ValidationResultsWrapper => {
  let error;
  const errors: KvMap<string> = {};
  try {
    const querySchema = safeGet<KvMap<Schema<any>>>(() => {
      // Attempt to grab the type from the first metric.
      const type = canaryConfig.metrics[0].query.type;
      return metricSourceIntegrations[type].canaryMetricSetQueryConfigSchema;
    }).orElse({});
    getCanaryConfigSchema(querySchema).validateSync(canaryConfig, { abortEarly: false, strict: true });
  } catch (e) {
    error = e;
  }

  if (error) {
    if (error.name !== 'ValidationError') {
      throw error;
    }
    const inner: ValidationError[] = error.inner;
    if (inner) {
      inner.forEach(validationError => {
        errors[validationError.path] = validationError.errors.join(', ');
      });
    }
  }

  return {
    errors: errors,
    isValid: Object.keys(errors).length === 0
  };
};
