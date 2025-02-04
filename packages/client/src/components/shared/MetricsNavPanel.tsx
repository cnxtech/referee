import * as React from 'react';
import {
  CanaryAnalysisResult,
  CanaryClassifierThresholdsConfig,
  CanaryConfig,
  CanaryJudgeGroupScore,
  CanaryMetricConfig,
  MetricSetPair
} from '../../domain/Kayenta';
import { Checkbox } from './Checkbox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamation } from '@fortawesome/free-solid-svg-icons';
import './MetricsNavPanel.scss';
import classNames from 'classnames';
import ScoreClassUtils from '../../util/ScoreClassUtils';
import { ofNullable } from '../../util/OptionalUtils';
import { boundMethod } from 'autobind-decorator';
import { Button } from 'react-bootstrap';

interface Props {
  config: CanaryConfig;
  metricSetPairsByIdMap: KvMap<MetricSetPair>;
  canaryAnalysisResultByIdMap: KvMap<CanaryAnalysisResult>;
  idListByMetricGroupNameMap: KvMap<string[]>;
  groupScoreByMetricGroupNameMap: KvMap<CanaryJudgeGroupScore>;
  metricGroupNamesDescByWeight: string[];
  thresholds: CanaryClassifierThresholdsConfig;
  classificationCountMap: Map<string, number>;
  handleOverviewSelection: () => void;
  handleMetricSelection: (id: string) => void;
}

interface State {
  filterMap: Map<string, boolean>;
}

enum filters {
  FAIL = 'Fail',
  NODATA = 'Nodata',
  PASS = 'Pass'
}

export default class MetricsNavPanel extends React.Component<Props, State> {
  constructor(props: Readonly<Props>) {
    super(props);

    const filterMap = new Map();
    filterMap.set(filters.FAIL, true);
    filterMap.set(filters.NODATA, true);
    filterMap.set(filters.PASS, false);

    this.state = {
      filterMap
    };
  }

  @boundMethod
  handleCheckboxChange(filter: string): void {
    const current = this.state.filterMap.get(filter);
    this.setState({ filterMap: this.state.filterMap.set(filter, !current) });
  }

  render(): React.ReactNode {
    const {
      config,
      metricSetPairsByIdMap,
      canaryAnalysisResultByIdMap,
      idListByMetricGroupNameMap,
      groupScoreByMetricGroupNameMap,
      classificationCountMap,
      metricGroupNamesDescByWeight,
      thresholds,
      handleOverviewSelection,
      handleMetricSelection
    } = this.props;

    return (
      <div className="metrics-container-wrapper">
        <div className="metrics-container">
          <div>
            <Button
              className="btn-block"
              onClick={() => {
                handleOverviewSelection();
              }}
              variant="outline-secondary"
            >
              Overview
            </Button>
          </div>
          <CheckboxRow
            classificationCountMap={classificationCountMap}
            filterMap={this.state.filterMap}
            handleCheckboxChange={this.handleCheckboxChange}
          />
          <div className="metrics-container-content">
            {metricGroupNamesDescByWeight.map(metricGroupName => {
              return (
                <div className="group-metrics-container-wrapper">
                  <div className="group-metrics-title-container">
                    <div className="group-metrics-name"> {metricGroupName}</div>
                    <div
                      className={classNames(
                        'group-score-tab',
                        'headline-md-brand',
                        ScoreClassUtils.getGroupClassFromScore(
                          groupScoreByMetricGroupNameMap[metricGroupName].score,
                          thresholds
                        )
                      )}
                    >
                      <div className="score-wrapper headline-md-marketing">
                        <div className="score">
                          {Number(groupScoreByMetricGroupNameMap[metricGroupName].score.toFixed(2))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="group-metrics-content">
                    {idListByMetricGroupNameMap[metricGroupName]
                      .filter(id => {
                        const canaryAnalysisResult: CanaryAnalysisResult = canaryAnalysisResultByIdMap[id];
                        return this.state.filterMap.get(canaryAnalysisResult.classification);
                      })
                      .map(id => {
                        const canaryAnalysisResult: CanaryAnalysisResult = canaryAnalysisResultByIdMap[id];
                        const metricName = canaryAnalysisResult.name;
                        const metricSetPair: MetricSetPair = metricSetPairsByIdMap[id];
                        const canaryMetricConfig: CanaryMetricConfig = ofNullable(
                          config.metrics.find(canaryMetricConfig => canaryMetricConfig.name === metricName)
                        ).orElseThrow(() => new Error(`Failed to find CanaryMetricConfig for ${metricName}`));
                        return (
                          <Metric
                            key={id}
                            id={id}
                            metricName={metricName}
                            canaryAnalysisResult={canaryAnalysisResult}
                            metricSetPair={metricSetPair}
                            canaryMetricConfig={canaryMetricConfig}
                            handleMetricSelection={handleMetricSelection}
                          />
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
          <Key />
        </div>
      </div>
    );
  }
}

const CheckboxRow = ({
  classificationCountMap,
  filterMap,
  handleCheckboxChange
}: {
  classificationCountMap: Map<string, number>;
  filterMap: Map<string, boolean>;
  handleCheckboxChange: (classification: string) => void;
}): JSX.Element => {
  return (
    <div className="metrics-filters-container">
      <div className="metrics-filter btn">
        <Checkbox
          label={`Fail (${classificationCountMap.get(filters.FAIL)})`}
          isSelected={!!filterMap.get(filters.FAIL)}
          onCheckboxChange={e => handleCheckboxChange(filters.FAIL)}
          key={filters.FAIL}
        />
      </div>
      <div className="metrics-filter btn">
        <Checkbox
          label={`No Data (${classificationCountMap.get(filters.NODATA)})`}
          isSelected={!!filterMap.get(filters.NODATA)}
          onCheckboxChange={e => handleCheckboxChange(filters.NODATA)}
          key={filters.NODATA}
        />
      </div>
      <div className="metrics-filter btn">
        <Checkbox
          label={`Pass (${classificationCountMap.get(filters.PASS)})`}
          isSelected={!!filterMap.get(filters.PASS)}
          onCheckboxChange={e => handleCheckboxChange(filters.PASS)}
          key={filters.PASS}
        />
      </div>
    </div>
  );
};

const Key = (): JSX.Element => {
  return (
    <div className="metrics-key-container">
      <div className="metrics-key-item">
        <div className="metrics-key-symbol dot fail"></div>
        <div className="metrics-key">Fail</div>
      </div>
      <div className="metrics-key-item">
        <div className="metrics-key-symbol dot nodata"></div>
        <div className="metrics-key">No Data</div>
      </div>
      <div className="metrics-key-item">
        <div className="metrics-key-symbol dot pass"></div>
        <div className="metrics-key">Pass</div>
      </div>
      <div className="metrics-key-item">
        <div className="metrics-key-symbol">
          <FontAwesomeIcon className="exclamation" size="1x" color="black" icon={faExclamation} />
        </div>
        <div className="metrics-key">Critical</div>
      </div>
    </div>
  );
};

const Metric = ({
  id,
  metricName,
  canaryAnalysisResult,
  metricSetPair,
  canaryMetricConfig,
  handleMetricSelection
}: {
  id: string;
  metricName: string;
  canaryAnalysisResult: CanaryAnalysisResult;
  metricSetPair: MetricSetPair;
  canaryMetricConfig: CanaryMetricConfig;
  handleMetricSelection: (id: string) => void;
}): JSX.Element => {
  return (
    <Button
      className="metric-container btn-block"
      onClick={() => {
        handleMetricSelection(id);
      }}
      variant="outline-secondary"
    >
      <div className="metric-name">{metricName}</div>
      <div className="metric-symbols">
        {canaryMetricConfig.analysisConfigurations.canary.critical && (
          <div className="metric-critical-symbol">
            <FontAwesomeIcon className="exclamation" size="1x" color="black" icon={faExclamation} />
          </div>
        )}
        <div
          className={classNames('dot', {
            [canaryAnalysisResult.classification.toLowerCase()]: true
          })}
        ></div>
      </div>
    </Button>
  );
};
