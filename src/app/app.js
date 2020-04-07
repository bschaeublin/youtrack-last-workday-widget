import DashboardAddons from 'hub-dashboard-addons';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Select from '@jetbrains/ring-ui/components/select/select';
import Panel from '@jetbrains/ring-ui/components/panel/panel';
import Button from '@jetbrains/ring-ui/components/button/button';
import EmptyWidget, {EmptyWidgetFaces} from '@jetbrains/hub-widget-ui/dist/empty-widget';
import ConfigurableWidget from '@jetbrains/hub-widget-ui/dist/configurable-widget';
import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';
import List from '@jetbrains/ring-ui/components/list/list';
import './app.css';
import getTimeTracking from './getTimeTracking';
import getAgiles from './getAgiles';

import {
  areSprintsEnabled,
  isCurrentSprint
} from './board';

class Widget extends Component {
  static propTypes = {
    dashboardApi: PropTypes.object,
    registerWidgetApi: PropTypes.func,
    currentSprintMode: PropTypes.bool,
  };
  
  static toSelectItem = it => it && {
    key: it.id,
    label: it.name,
    description: it.homeUrl,
    model: it
  };

  constructor(props) {
    super(props);
    const {registerWidgetApi, dashboardApi} = props;

    this.state = {
      isConfiguring: false,
      agiles: [],
      agile: props.agile,
      sprint: props.sprint,
      currentSprintMode: props.currentSprintMode
    };

    registerWidgetApi({
      onConfigure: () => this.setState({isConfiguring: true}),
      onRefresh: () => this.specifyAgile.bind(this)
    });
  }
  
  componentDidMount() {
    const {dashboardApi} = this.props;
    this.initialize(dashboardApi);
  }

  async initialize(dashboardApi) {
    this.loading = true;
    
    let youtracks = await this.props.dashboardApi.loadServices('YouTrack');
    this.serviceId = youtracks[0].id;

    await this.specifyAgile();
    this.loading = false;
  }

  async specifyAgile() {
    let config = await this.props.dashboardApi.readConfig();
    let agiles = await getAgiles(this.props.dashboardApi, this.serviceId);

    if (config && config.agile) {
      var query = `Board ${config.agile.name}: {${config.agile.currentSprint.name}}`;
      let data = await getTimeTracking(this.props.dashboardApi, query, this.serviceId);
      this.setState({data: data});
    }

    this.setState({agiles});
    console.log('agiles', agiles);
  }

  saveConfig = async () => {
    const {agile, sprint, currentSprintMode} = this.state;
    await this.props.dashboardApi.storeConfig({agile, sprint, currentSprintMode});
    this.setState({isConfiguring: false}, this.specifyAgile);
  };

  cancelConfig = async () => {
    this.setState({isConfiguring: false});
    await this.props.dashboardApi.exitConfigMode();
    this.initialize(this.props.dashboardApi);
  };

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

    const {agile, agiles, sprint, currentSprintMode} = this.state;
    console.log('agiles2', agiles, this.state);

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

    return (
      <div className="widget">
           <div className="ring-form__group">
              <Select
                size={Select.Size.FULL}
                data={agiles.map(Widget.toSelectItem)}
                selected={Widget.toSelectItem(agile)}
                onChange={this.changeAgile.bind(this)}
                filter
                label="Select Agile Board"
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
                label={'Select sprint'}
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
    label: 'Always use current sprint',
    description: currentSprint ? currentSprint.name : ''
  })

  renderWidgetBody() {    
    console.log('serviceId', this.serviceId);
    console.log('render called');
    const {data} = this.state;

    return (
      <div className="widget">
        {
          data
          ?       
          (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Time spent</th>
              </tr>
            </thead>
            <tbody>
              {
                this.renderTableRows(data)
              }
            </tbody>
          </table>)
          : (
            <EmptyWidget
              face={EmptyWidgetFaces.JOY}
              message={'Select "Edit..." option in widget dropdown to configure text color'}
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
        widgetTitle={'Rapportierung gestern'}
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
        return <tr style={{color: isExceeding ? 'red': 'green'}} key={item.userName}>
          <td>{item.userName}</td>
          <td>{item.spentTimeDisplay}</td>
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
