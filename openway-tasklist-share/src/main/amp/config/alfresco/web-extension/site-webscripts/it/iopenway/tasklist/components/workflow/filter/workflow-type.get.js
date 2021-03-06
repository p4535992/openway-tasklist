<import resource="classpath:alfresco/site-webscripts/org/alfresco/components/workflow/workflow.lib.js">

var workflowDefinitions = getWorkflowDefinitions(),
   filters = [];
filters.push(
	      {
	         id: "workflow-type",
	         data: "*",
	         label: "Tutti"
	      });

if (workflowDefinitions)
{
   for (var i = 0, il = workflowDefinitions.length; i < il; i++)
   {
      filters.push(
      {
         id: "workflow-type",
         data: workflowDefinitions[i].name,
         label: workflowDefinitions[i].title
      });
   }
}
model.filters = filters;
