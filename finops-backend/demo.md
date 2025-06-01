# Demo Natural Language Commands

## AWS Cost Explorer Commands
Data Source Name:  AWS Engineering Team
AWS Access Key ID: AKIA987654321DEVTEST
AWS Secret Access Key: dJx8rKUvnFEMI/P9QDFRG/cQxRfiCYDEVTESTKEY
AWS Account ID: 987654321098
Primary Region: US West (Oregon)
Cross-Account Role ARN: arn:aws:iam::987654321098:role/DevOpsMonitoring
External ID: dev-external-id-2024
### Fixed Threshold Examples

Monitor AWS_CE_SVC_1 spending every minute. If AWS_CE_SVC_1 cost is greater than $450, suggest reviewing reserved instance utilization.
Review AWS_CE_SVC_1 monthly spend every minute. If cost for 'AWS_CE_SVC_1' exceeds $600, recommend AWS cost optimization review.


### Percentage-Based Anomaly Detection

Check AWS_CE_SVC_2 costs every minute. If cost is more than 25% above the 7-day average, suggest investigating spot instance usage.


---
## Kubernetes Commands
Data Source Name: Production K8s Cluster - Engineering
Kubeconfig File Path: /home/finops/.kube/prod-config
Cluster API Endpoint: https://k8s-prod.cisco.com:6443
Service Account Token: eyJhbGciOiJSUzI1NiIsImtpZCI6IktERU1PLVRva2VuLUZpbk9wcy1DbHVzdGVyIn0.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJmaW5vcHMtbW9uaXRvcmluZyIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJmaW5vcHMtdG9rZW4teDJoOXMiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZmlub3BzLXJlYWRvbmx5IiwidWlkIjoiMTIzNDU2NzgtOTBhYi1jZGVmLTEyMzQtNTY3ODkwYWJjZGVmIn0.demo-token-signature
Prometheus Endpoint: http://prometheus.monitoring.svc.cluster.local:9090
Cost Model Endpoint: http://cost-model.kubecost.svc.cluster.local:9003
Default Namespace: finops-monitoring
### Resource Optimization

Monitor K8S_POD_1 resource costs every minute. If cost for 'K8S_POD_1' exceeds $70, recommend optimizing pod requests.
Analyze K8S_POD_1 costs every minute. If cost is more than 30% above the 7-day average, suggest reviewing HPA settings.


### Usage-Based Alerts
Check K8S_POD_2 memory usage every minute. If K8S_POD_2 units are above 5, alert for high resource consumption.
Track K8S_POD_2 cluster costs every minute. If cost for 'K8S_POD_2' goes above $45, recommend node optimization.
---

## Azure Cost Management Commands

### Compute & Storage

Monitor AZ_VM_1 compute costs every minute. If cost for 'AZ_VM_1' is greater than $250, flag for Azure budget review.
Check AZ_VM_2 storage costs every minute. If cost is more than 20% above the 7-day average, suggest reviewing disk tiers.
Track AZ_VM_2 network costs every minute. If cost for 'AZ_VM_2' goes above $180, suggest bandwidth optimization.


### Monthly Reviews
Analyze AZ_VM_1 monthly spend every minute. If cost for 'AZ_VM_1' exceeds $300, recommend Azure advisor review.


---

## GCP Billing Commands
### Compute & Storage Classes
Monitor GCP_INSTANCE_1 compute costs every minute. If cost for 'GCP_INSTANCE_1' goes above $380, suggest looking at GCP sustained usage discounts.

Check GCP_INSTANCE_2 storage costs every minute. If cost is more than 18% above the 7-day average, recommend reviewing storage classes.


### BigQuery & Networking
Analyze GCP_INSTANCE_1 BigQuery costs every minute. If cost for 'GCP_INSTANCE_1' exceeds $420, suggest query optimization.
Track GCP_INSTANCE_2 networking every minute. If cost for 'GCP_INSTANCE_2' goes above $280, recommend VPC optimization.


---

## Kibana/Elasticsearch Commands
Data Source Name: Production Kibana Analytics
Elasticsearch Hosts: https://es-prod-1.cisco.com:9200,https://es-prod-2.cisco.com:9200
☑️ Use API Key instead of Username/Password
API Key: a2liYW5hLWRlbW8tYXBpLWtleS1mb3ItZmlub3BzLWhhY2thdGhvbg==
Kibana Host: https://kibana-prod.cisco.com:5601
Kibana Space: finops
Cost Index Pattern: billing-*
### Indexing & Search Optimization
Monitor KIBANA_IDX_1 indexing costs every minute. If cost for 'KIBANA_IDX_1' is over $8, recommend reviewing index patterns.
Check KIBANA_IDX_2 search costs every minute. If cost is more than 20% above the 7-day average, suggest optimizing queries.


### Storage & Sharding
Analyze KIBANA_IDX_1 storage every minute. If KIBANA_IDX_1 units are above 150, alert for high document count.
Track KIBANA_IDX_2 cluster costs every minute. If cost for 'KIBANA_IDX_2' exceeds $12, recommend shard optimization.


---

## Splunk Commands
Data Source Name: Security Splunk - SOC Team
Splunk Host: splunk-security.cisco.com
Management Port: 8089
☐ Use Auth Token instead of Username/Password
Username: finops_service_account
Password: SecureP@ssw0rd2024!
Default Index: security_billing
### Data Ingestion & Retention
Monitor SPLUNK_EVT_1 ingestion costs every minute. If cost for 'SPLUNK_EVT_1' is over $25, recommend reviewing data retention policies.
Check SPLUNK_EVT_2 search costs every minute. If cost is more than 22% above the 7-day average, suggest optimizing search queries.


### Volume & Licensing
Analyze SPLUNK_EVT_1 licensing every minute. If SPLUNK_EVT_1 units are above 800, alert for high event volume.
Track SPLUNK_EVT_2 indexing costs every minute. If cost for 'SPLUNK_EVT_2' exceeds $18, recommend data filtering.


---

## SharePoint Commands

### Document Lifecycle & Sync
Monitor SP_DOC_1 storage costs every minute. If cost for 'SP_DOC_1' is over $3, recommend reviewing document lifecycle.
Check SP_DOC_2 sync costs every minute. If cost is more than 15% above the 7-day average, suggest optimizing sync frequency.


### API Usage & Bandwidth
Analyze SP_DOC_1 API usage every minute. If SP_DOC_1 units are above 75, alert for high document activity.
Track SP_DOC_2 bandwidth costs every minute. If cost for 'SP_DOC_2' exceeds $2.5, recommend content optimization.


---

## Datadog Commands

### Log Management & Retention
Monitor LOG_SRC_1 ingestion costs every minute. If cost for 'LOG_SRC_1' is over $15, recommend checking log verbosity.
Check LOG_SRC_2 retention costs every minute. If cost is more than 25% above the 7-day average, suggest reviewing log retention policies.


### API & Dashboard Optimization
Analyze LOG_SRC_1 API usage every minute. If LOG_SRC_1 units are above 15000, alert for high API call volume.
Track LOG_SRC_2 monitoring costs every minute. If cost for 'LOG_SRC_2' exceeds $22, recommend optimizing dashboards.
