/*-
 * ==============================LICENSE=============================
 * Intesys Openway Tasklist - Share
 * %%
 * Copyright (C) 2016 - 2017 Intesys Openway Srl
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * ============================LICENSE-END===========================
 */
if (typeof Openway == "undefined" || !Openway) {
	Openway = { component : {} };
}

(function() {
	
	var Dom = YAHOO.util.Dom,
		Event = YAHOO.util.Event,
		Selector = YAHOO.util.Selector;

	/**
	 * Openway.component.TaskListToolbar constructor.
	 *
	 * @param name {String} The name of the component
	 * @param id {String} he DOM ID of the parent element
	 * @param components {Array} Optional: Array of required YAHOO
	 * @return {object} The new instance
	 * @constructor
	 */
	Openway.component.TaskListToolbar = function (htmlId) {
		Openway.component.TaskListToolbar.superclass.constructor.call(this, "Openway.component.TaskListToolbar", htmlId, ["button"]);
		return this;
	};

	YAHOO.extend(Openway.component.TaskListToolbar, Alfresco.component.Base,
		{
			widgets : {
				startWorkflowButton : null,
				taskSelect : null,
				transitions : {}
			},
			
			onReady : function TLT_onReady() {
				var me = this;

		        this.widgets.startWorkflowButton = Alfresco.util.createYUIButton(this, "startWorkflow-button", this._onStartWorkflowButtonClick, {});
		         
	            this.widgets.taskSelect = Alfresco.util.createYUIButton(this, "taskSelect-button", this._onTaskSelect, {
	               type: "menu",
	               menu: "taskSelect-menu"
	            });
	            
		        Dom.removeClass(Selector.query(".hidden", this.id + "-body", true), "hidden");

	            this.widgets.taskList = Alfresco.util.ComponentManager.get(this.id.replace('_toolbar_', '_list_'));

	    		YAHOO.Bubbling.on("filterTasksChanged", this.onFilterTasksChanged, this);
			},

			/**
			 * Start workflow button click handler
			 *
			 * @method onNewFolder
			 * @param e {object} DomEvent
			 * @param p_obj {object} Object passed back from addListener method
			 */
			_onStartWorkflowButtonClick: function WLT_onNewFolder(e, p_obj) {
			   document.location.href = Alfresco.util.siteURL("start-workflow?referrer=tasks&myTasksLinkBack=true");
			},

			_onTaskSelect : function TLT_onTaskSelect (sType, aArgs, p_obj) {
				var domEvent = aArgs[0], eventTarget = aArgs[1];

				// Select based upon the className of the clicked item
				this._selectTasks(Alfresco.util.findEventClass(eventTarget));
				Event.preventDefault(domEvent);
			},

			/**
			 * Public function to select tasks by specified groups
			 *
			 * @method _selectTasks
			 * @param p_selectType {string} Can be one of the following:
			 * <pre>
			 * selectAll - all tasks
			 * selectNone - deselect all
			 * selectInvert - invert selection
			 * </pre>
			 */
			_selectTasks : function TLT_selectTasks (p_selectType) {
				var containerElement = Dom.get(this.widgets.taskList.id + "-tasks"),
					oRecordSet = this.widgets.taskList.widgets.pagingDataTable.widgets.dataTable.getRecordSet(), 
					checks = YAHOO.util.Selector.query('input[type="checkbox"]', containerElement), 
					len = checks.length,
					oRecord, record, i, fnCheck;

				switch (p_selectType) {
				case "selectAll":
					fnCheck = function chkSelectAll(record, isChecked) {
						return true;
					};
					break;

				case "selectNone":
					fnCheck = function chkSelectNone(record, isChecked) {
						return false;
					};
					break;

				case "selectInvert":
					fnCheck = function chkSelectInvert(record, isChecked) {
						return !isChecked;
					};
					break;

				default:
					fnCheck = function chkDefault(record, isChecked) {
						return isChecked;
					};
				}

				for (i = 0; i < len; i++) {
					oRecord = oRecordSet.getRecord(i);
					record = oRecord.getData();
					this.widgets.taskList.selectedItems[record.id] = checks[i].checked = fnCheck(record, checks[i].checked);
				}

				YAHOO.Bubbling.fire("selectedTasksChanged");
			},
			
			/**
			 * Fired when the currently active filter has changed
			 *
			 * @method onFilterChanged
			 * @param layer {string} the event source
			 * @param args {object} arguments object
			 */
			onFilterTasksChanged: function (layer, args) {
				var toolbar = this.id.replace("_toolbar_", "_filter-mgr_");
				toolbar = Alfresco.util.ComponentManager.get(toolbar);
				
				var workflows = null;
				var taskType = null;
				
				for (var i = 0; i < toolbar.options.currentFilter.length; i++) {
					var filter = toolbar.options.currentFilter[i];

					if(filter.indexOf("workflows|")==0) {
						workflows = filter.replace("workflows|", "");
					} else if(filter.indexOf("task-type|")==0) {
						taskType = filter.replace("task-type|", "");
					}
				}

				this._clearTransitions();
				if (workflows=="active" && taskType!="*") {
					this._setTransitions(taskType);
				}

			},
			
			_setTransitions : function (taskType) {
				var me = this;
				Alfresco.util.Ajax.jsonGet({
					url : Alfresco.constants.URL_SERVICECONTEXT
						+ "components/iopenway/workflow/task-transitions?taskType=" + taskType,
					successCallback : {
						fn : function(response) {
							if (response.json !== undefined 
									&& response.json.transitions 
									&& response.json.transitions.length > 0) {
								this.widgets.transitions = {};
								
								var container = Dom.get(this.id + "-transitions-buttons");
								for (var i = 0; i < response.json.transitions.length; i++) {
									var value = response.json.transitions[i].value;
									var label = Alfresco.util.message(response.json.transitions[i].label);
									
									var button = new YAHOO.widget.Button( {
												type : 'button',
												label: label,
												name : value,
												container : this.id + "-transitions-buttons"
											});
									button.on("click", this._onClickTransitions, button, this );
									this.widgets.transitions[value] = button;
								}
								Dom.removeClass(Selector.query(".task-select"), "hidden");
			                }
						},
						scope : this
					},
					failureMessage : Alfresco.util.message("error.forminitialize"),
					scope : this
				});
				
			},
			
			_clearTransitions : function () {
				this.widgets.transitions = {};
				Dom.addClass(Selector.query(".task-select"), "hidden");
				Dom.get(this.id + "-transitions-buttons").innerHTML = "";
			},

			_onClickTransitions : function (e, p_obj) {
				var items = this.widgets.taskList.selectedItems;
				var taskIds = [];
				for (var key in items) {
					if (items[key] == true) {
						taskIds.push(key);
					}
				}
				if (taskIds.length == 0) {
					return;
				}
				
				var transitionId = p_obj.get("name");
				
				if (transitionId.indexOf("fn:")==0) {
					// E' configurato per chiamare una funzione...
					var funcName = transitionId.replace("fn:", "");
					eval("this." + funcName + "(taskIds)");
				} else {
					
					this._completeTasks(transitionId, null, taskIds);
				}
			},
			
			_completeTasks : function (transitionId, properties, taskIds) {
				var me = this;
				/**
				 * Funzione per stampare e ricarica la pagina
				 */
				function _printReport (report) {
	               Alfresco.util.PopupManager.displayPrompt({
                      title: Alfresco.util.message("label.taskclosingresult"),
                      text: report
                   });
	               me.widgets.taskList.widgets.pagingDataTable.reloadDataTable();
				}
				
				// E' configurato per lanciare la chiusura dei tasks selezionati...
				Alfresco.util.Ajax.jsonPost({
					url : Alfresco.constants.PROXY_URI + "it/iopenway/complete-tasks",
					dataObj : {
						transitionId : transitionId,
						properties : properties,
						taskIds : taskIds
					},
					successCallback : {
						fn : function(response) {
							if (response.json !== undefined) {
								_printReport(response.json.report);
			                }
						},
						scope : this
					},
					failureCallback : {
						fn : function(response) {
							_printReport(Alfresco.util.message("error.taskclosingerror"));
						},
						scope : this
					},
					scope : this
				});
			}

		});
})();
