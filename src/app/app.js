import DashboardAddons from 'hub-dashboard-addons';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Select from '@jetbrains/ring-ui/components/select/select';
import Panel from '@jetbrains/ring-ui/components/panel/panel';
import Button from '@jetbrains/ring-ui/components/button/button';
import Avatar, {Size} from '@jetbrains/ring-ui/components/avatar/avatar';
import Badge from '@jetbrains/ring-ui/components/badge/badge';
import Group from '@jetbrains/ring-ui/components/group/group';
import Text from '@jetbrains/ring-ui/components/text/text';
import Icon from '@jetbrains/ring-ui/components/icon/icon';
import checkmarkIcon from '@jetbrains/icons/checkmark.svg';
import userWarning from '@jetbrains/icons/user-warning.svg';
import EmptyWidget, {EmptyWidgetFaces} from '@jetbrains/hub-widget-ui/dist/empty-widget';
import ConfigurableWidget from '@jetbrains/hub-widget-ui/dist/configurable-widget';
import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';
import List from '@jetbrains/ring-ui/components/list/list';
import './app.css';
import getTimeTracking from './getTimeTracking';
import getAgiles from './getAgiles';
import getGlobalTimeTrackingSettings from './getGlobalTimeTrackingSettings';

import {
  areSprintsEnabled,
  isCurrentSprint,
  getLastWorkDate
} from './board';

class Widget extends Component {
  static propTypes = {
    dashboardApi: PropTypes.object,
    registerWidgetApi: PropTypes.func,
    currentSprintMode: PropTypes.bool,
    agiles: PropTypes.array,
    agile: PropTypes.object,
    sprint: PropTypes.object,
    minutesADay: PropTypes.number,
    minutesWarning: PropTypes.number
  };
  
  static toSelectItem = it => it && {
    key: it.id,
    label: it.name,
    description: it.homeUrl,
    model: it
  };

  static numberToSelectItem = it => Widget.toSelectItem({id: it, name: `${it}m`});

  constructor(props) {
    super(props);
    const {registerWidgetApi} = props;
    console.log(props);
    this.state = {
      isConfiguring: false,
      agiles: [],
      agile: props.agile,
      sprint: props.sprint,
      currentSprintMode: props.currentSprintMode,
      minutesWarning: props.minutesWarning ? props.minutesWarning : 90
    };

    registerWidgetApi({
      onConfigure: () => this.setState({isConfiguring: true}),
      onRefresh: () => this.specifyAgile.bind(this)
    });
  }
  
  componentDidMount() {
    this.initialize();
  }

  async initialize() {
    this.loading = true;
    let youtracks = await this.props.dashboardApi.loadServices('YouTrack');
    this.serviceId = youtracks[0].id;

    await this.specifyAgile();
    this.loading = false;
  }

  async specifyAgile() {
    const {dashboardApi} = this.props;
    let config = await dashboardApi.readConfig();
    let agiles = await getAgiles(dashboardApi, this.serviceId);

    if (config && config.agile) {
      let timeTrackingSettings = await getGlobalTimeTrackingSettings(dashboardApi, this.serviceId);
      let dates = getLastWorkDate(timeTrackingSettings.workDays);
      this.setState({minutesWarning: config.minutesWarning});
      this.setState({minutesADay: timeTrackingSettings.minutesADay });
      var query = `Board ${config.agile.name}: {${config.agile.currentSprint.name}}`;
      let data = await getTimeTracking(dashboardApi, query, this.serviceId, timeTrackingSettings, dates, config.minutesWarning);
      this.setState({data: data});
    }

    this.setState({agiles});
  }

  saveConfig = async () => {
    const {agile, sprint, currentSprintMode, minutesWarning} = this.state;
    await this.props.dashboardApi.storeConfig({agile, sprint, currentSprintMode, minutesWarning});
    this.setState({isConfiguring: false}, this.specifyAgile);
  };

  cancelConfig = async () => {
    this.setState({isConfiguring: false});
    await this.props.dashboardApi.exitConfigMode();
    this.initialize(this.props.dashboardApi);
  };

  changeMinutesWarning = selected => {
    const minutes = (selected.model || {}).id || selected;
    this.setState({minutesWarning: minutes});
  }

  changeAgile = selected => {
    const selectedAgile = selected.model || selected;
    const sprints = selectedAgile && selectedAgile.sprints || [];
    if (sprints.length) {
      const hasCurrentSprint = selectedAgile.currentSprint ||
        sprints.some(isCurrentSprint);
      this.changeSprint(
        hasCurrentSprint
          ? Widget.getCurrentSprintSelectOption()
          : sprints[0]
      );
    }

    this.setState({agile: selectedAgile});
  };

  changeSprint = selectedSprint => {
    if (selectedSprint.key === 'current-sprint') {
      this.setState({
        sprint: null,
        currentSprintMode: true
      });
    } else {
      this.setState({
        sprint: selectedSprint.model || selectedSprint,
        currentSprintMode: false
      });
    }
  };

  renderConfiguration() {
    if (this.isLoading) {
      return <LoaderInline/>;
    }

    this.props.dashboardApi.enterConfigMode();
    const {agile, agiles, sprint, currentSprintMode, minutesWarning} = this.state;

    const getSprintsOptions = () => {
      const sprints = (agile.sprints || []);
      const sprintsOptions = sprints.map(Widget.toSelectItem);
      const currentSprint = (agile && agile.currentSprint) ||
        sprints.filter(isCurrentSprint)[0];
      if (currentSprint) {
        sprintsOptions.unshift({
          rgItemType: List.ListProps.Type.SEPARATOR
        });
        sprintsOptions.unshift(
          Widget.getCurrentSprintSelectOption(currentSprint)
        );
      }
      return sprintsOptions;
    };

    const getWarningLimits = () => {
      let data = [0, 30, 60, 90, 120, 180].map(Widget.numberToSelectItem);
      return data;
    }

    const getSelectedLimit = () => {
      let limit = Widget.numberToSelectItem(minutesWarning);
      return limit;
    }

    return (
      <div className="widget">

        <div className="ring-form__group">
            <Select
                size={Select.Size.FULL}
                data={getWarningLimits()}
                selected={getSelectedLimit()}
                onChange={this.changeMinutesWarning.bind(this)}
                label="Abweichung für eine Warnung (Minuten, +/-)"
                />
           </div>

           <div className="ring-form__group">
              <Select
                size={Select.Size.FULL}
                data={agiles.map(Widget.toSelectItem)}
                selected={Widget.toSelectItem(agile)}
                onChange={this.changeAgile.bind(this)}
                filter
                label="Agiles Board auswählen"
              />
           </div>

          {
           areSprintsEnabled(agile) && 
           (
           <div className="ring-form__group">
              <Select
                size={Select.Size.FULL}
                data={getSprintsOptions()}
                selected={
                  currentSprintMode
                    ? Widget.getCurrentSprintSelectOption()
                    : Widget.toSelectItem(sprint)
                }
                onSelect={this.changeSprint}
                filter
                label={'Sprint auswählen'}
              />
            </div>
            )
            }
      
          <Panel>
            <Button primary onClick={this.saveConfig.bind(this)}>{'Save'}</Button>
            <Button onClick={this.cancelConfig.bind(this)}>{'Cancel'}</Button>
          </Panel>
      </div>
    );
  }

  static getCurrentSprintSelectOption = currentSprint => ({
    key: 'current-sprint',
    label: 'Immer aktuellen Sprint verwenden',
    description: currentSprint ? currentSprint.name : ''
  })

  renderWidgetBody() {    
    const {data, minutesADay, minutesWarning} = this.state;

    return (
      <div className="widget">
        {
          data
          ?       
          (
            <div>
              <Group className="lead-text-time-track">
                <Text>Ziel:</Text>
                <Text info>{ (minutesADay / 60)}h</Text>
                <Text>Toleranz: </Text>
                <Text info>+/- {minutesWarning}m</Text>
              </Group>

              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th align="left"></th>
                  </tr>
                </thead>
                <tbody>
                  {
                    this.renderTableRows(data)
                  }
                </tbody>
              </table>

              {
                data.filter(item => item.exceedThreshold).length === 0 ?
                (<div class="time-track-face-container">
                  <span class="time-track-face">{EmptyWidgetFaces.HAPPY}</span>
                  <Text info>Einwandfrei!</Text>
                  </div>)
              : (<div class="time-track-face-container">
                  <span class="time-track-face">{EmptyWidgetFaces.OK}</span>
                  <br />
                  <Text info>Optimierungspotenzial?</Text>
                </div>)
              }
              
          </div>)
          : (
            <EmptyWidget
              face={EmptyWidgetFaces.JOY}
              message={'Wähle die "Bearbeiten..." Option im Widget Menu, um es zu konfigurieren.'}
            />
          )}
      </div>
    );
  }

  renderContent = () => { 
    if (this.isLoading) {
      return <LoaderInline/>;
    }

    return this.renderWidgetBody();
  }

  render() {
    return (
      <ConfigurableWidget
        isConfiguring={this.state.isConfiguring}
        dashboardApi={this.props.dashboardApi}
        widgetTitle={'Rapportierung vergangener Arbeitstag'}
        widgetLoader={this.isLoading}
        Configuration={this.renderConfiguration.bind(this)}
        Content={this.renderContent.bind(this)}
      />
    );
  }
  
  renderTableRows(array) {

    return array.map(item =>
      {
        let isExceeding = item.exceedThreshold;
        return <tr key={item.userName}>
          <td><Avatar size={Size.Size56} url={item.avatar}/></td>
          <td style={{verticalAlign: 'top'}}>
            <Text>
              <b>{item.userName}</b>
            </Text>            
            <div>
              <Badge valid={!isExceeding} gray={isExceeding} className="badge-time-track">
                {item.spentTimeDisplay}
                <Icon size={Icon.Size.Size14} glyph={isExceeding ? userWarning : checkmarkIcon} className="icon-time-track"></Icon>
              </Badge>
            </div>
          </td>
        </tr>
      }
    
    );
  }
}


DashboardAddons.registerWidget((dashboardApi, registerWidgetApi) =>
  render(
    <Widget
      dashboardApi={dashboardApi}
      registerWidgetApi={registerWidgetApi}
    />,
    document.getElementById('app-container')
  )
);
