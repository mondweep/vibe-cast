# ADR-012: Kubernetes Deployment Architecture — Istio Service Mesh for Week 13

**Status:** ACCEPTED (2026-06-02)  
**Context:** Week 13 infrastructure; Phase 2 production readiness  
**Deciders:** Platform engineering, DevOps lead  

---

## Problem

Vibe-Cast microservices (Learning, Certification, Skill Lab, Community, Metrics) must communicate reliably across dynamically scheduled containers. Week 9-12 deployments run on single machine or basic Docker Compose. Week 13 requires:

1. **Service discovery:** 5 services × 3-5 replicas each (15+ containers). Services must find each other as containers restart/rescale.
2. **Traffic management:** Route exam requests to high-memory pods. Route analytics to bursty workloads. Handle mismatched service versions (Learning v2, Certification v1).
3. **Resilience:** Circuit break failing Certification service. Retry transient errors (timeout, 5xx) 3x with exponential backoff. Prevent thundering herd (rate limit 100 req/s per service).
4. **Observability:** Distributed tracing (correlationId spans Envoy → Learning → Certification). Metrics (request latency, error rates by service pair).
5. **Security:** mTLS between services. Network policies restricting traffic (Community → Metrics OK; Metrics → Learning DENY).
6. **Cost:** Managed Kubernetes (EKS/AKS/GKE) $200+/month. Self-hosted too complex Week 13.

**Constraints:**
- Week 9-12: Docker Compose or single-machine
- Week 13: Kubernetes (managed EKS/AKS) with Istio service mesh
- Scale: 500 learners, 50 concurrent workflows, 1000+ events/min
- Compliance: Audit trail, no data exfiltration, GDPR-ready

---

## Decision

Deploy Vibe-Cast on **Kubernetes with Istio service mesh**:

### Architecture (Week 13)

```
┌────────────────────────────────────────────────────────┐
│         Kubernetes Cluster (EKS/AKS/GKE)               │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Istio Service Mesh (Envoy sidecars on every pod) │ │
│  │                                                    │ │
│  │  ┌──────────┐    ┌──────────┐   ┌──────────┐    │ │
│  │  │ Learning │    │Cert.     │   │SkillLab  │    │ │
│  │  │ Service  │────│Service   │───│Service   │    │ │
│  │  │ (x3)     │    │ (x2)     │   │ (x2)     │    │ │
│  │  └──────────┘    └──────────┘   └──────────┘    │ │
│  │       │               │             │             │ │
│  │       └───────────────┼─────────────┘             │ │
│  │                       │                           │ │
│  │  ┌──────────┐    ┌────▼──────┐                   │ │
│  │  │ Community│    │ Metrics   │                   │ │
│  │  │Service   │    │(Analytics)│                   │ │
│  │  │(x2)     │    │(x2)       │                   │ │
│  │  └──────────┘    └───────────┘                   │ │
│  │                                                    │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │    PostgreSQL StatefulSet (replicated)      │ │ │
│  │  │    ClickHouse StatefulSet                   │ │ │
│  │  │    Redis Cache                              │ │ │
│  │  │    RabbitMQ Cluster                         │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  │  Istio: Circuit Breaker, Retries, Rate Limit,   │ │
│  │          Traffic Shifting, Distributed Tracing   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Ingress (API Gateway)                            │  │
│  │  - HTTPS termination                             │  │
│  │  - Rate limiting (API consumers)                 │  │
│  │  - Authentication (JWT)                          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
       │
       └─→ Monitoring (Prometheus, Grafana)
       └─→ Logging (Loki, ELK)
       └─→ Tracing (Jaeger)
```

### Kubernetes Manifests

**Namespace & RBAC:**
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: vibe-cast
  labels:
    istio-injection: enabled  # Auto-inject Envoy sidecars

---
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: learning-service
  namespace: vibe-cast

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: vibe-cast-reader
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: vibe-cast-read-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: vibe-cast-reader
subjects:
- kind: ServiceAccount
  name: learning-service
  namespace: vibe-cast
```

**Deployment: Learning Service**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learning-service
  namespace: vibe-cast
spec:
  replicas: 3
  selector:
    matchLabels:
      app: learning
      version: v1
  template:
    metadata:
      labels:
        app: learning
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: learning-service
      containers:
      - name: learning
        image: vibe-cast/learning:v1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: EVENT_BUS_TYPE
          value: "rabbitmq"
        - name: RABBITMQ_URL
          valueFrom:
            secretKeyRef:
              name: rabbitmq-credentials
              key: url
        - name: CACHE_URL
          value: "redis://redis-cache:6379"
        - name: SERVICE_NAME
          value: "learning-service"
        - name: JAEGER_AGENT_HOST
          value: "jaeger-agent"
        - name: JAEGER_AGENT_PORT
          value: "6831"
        
        # Readiness: service ready to accept requests
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 3
        
        # Liveness: restart if deadlocked
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        
        # Resource requests/limits
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        
        # Graceful shutdown
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]  # Wait for in-flight requests
      
      # Pod Disruption Budget (protect during node drain)
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - learning
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: learning-service
  namespace: vibe-cast
spec:
  selector:
    app: learning
  ports:
  - port: 80
    targetPort: 3000
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
  type: ClusterIP
```

**Istio Virtual Service (Traffic Management)**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: learning
  namespace: vibe-cast
spec:
  hosts:
  - learning-service
  http:
  # Route rule 1: 90% to v1, 10% to v2 (canary deployment)
  - match:
    - uri:
        prefix: "/api"
    route:
    - destination:
        host: learning-service
        subset: v1
      weight: 90
    - destination:
        host: learning-service
        subset: v2
      weight: 10
    # Retry policy
    retries:
      attempts: 3
      perTryTimeout: 2s
    # Timeout
    timeout: 10s
    # Fault injection (chaos testing)
    fault:
      delay:
        percentage: 0.1  # 0.1% of requests delayed
        fixedDelay: 5s

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: learning
  namespace: vibe-cast
spec:
  host: learning-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutive5xxErrors: 5          # After 5 500-errors, eject pod
      interval: 30s                     # Check every 30s
      baseEjectionTime: 30s             # Eject for 30s then retry
      minRequestVolume: 10
    loadBalancer:
      simple: ROUND_ROBIN

  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2

---
apiVersion: networking.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: learning-jwt
  namespace: vibe-cast
spec:
  jwtRules:
  - issuer: "https://auth.vibe-cast.local"
    jwksUri: "https://auth.vibe-cast.local/.well-known/jwks.json"
    audiences: "learning-api"

---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: learning-authz
  namespace: vibe-cast
spec:
  rules:
  # Allow from ingress gateway
  - from:
    - source:
        principals: ["cluster.local/ns/istio-system/sa/istio-ingressgateway-sa"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/learners/*"]
  # Allow from certification service (mTLS)
  - from:
    - source:
        principals: ["cluster.local/ns/vibe-cast/sa/certification-service"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/learners/*/progress"]
```

**RabbitMQ Cluster (Event Bus)**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: vibe-cast
spec:
  serviceName: rabbitmq
  replicas: 3
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3.12-management
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        env:
        - name: RABBITMQ_ERLANG_COOKIE
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: erlang-cookie
        - name: RABBITMQ_DEFAULT_USER
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: username
        - name: RABBITMQ_DEFAULT_PASS
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: password
        livenessProbe:
          exec:
            command: ["rabbitmq-diagnostics", "ping"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["rabbitmq-diagnostics", "ping"]
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
  namespace: vibe-cast
spec:
  clusterIP: None
  selector:
    app: rabbitmq
  ports:
  - port: 5672
    name: amqp
  - port: 15672
    name: management
```

**PostgreSQL Persistent Storage**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vibe-cast-fast
provisioner: ebs.csi.aws.com  # AWS EBS; adjust for Azure/GCP
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: vibe-cast
spec:
  serviceName: postgres
  replicas: 1  # Primary; secondary via WAL streaming
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "vibe_cast"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "postgres"]
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 2Gi
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: vibe-cast-fast
      resources:
        requests:
          storage: 50Gi
```

---

## Deployment Workflow

### Canary Deployment (5% traffic → 50% → 100%)

```yaml
# Stage 1: Deploy v2 alongside v1
kubectl set image deployment/learning-service \
  learning=vibe-cast/learning:v2.0.0 -n vibe-cast

# Stage 2: Update VirtualService to shift traffic
kubectl patch virtualservice learning -n vibe-cast --type merge -p '
spec:
  http:
  - route:
    - destination:
        host: learning-service
        subset: v1
      weight: 95
    - destination:
        host: learning-service
        subset: v2
      weight: 5
'

# Monitor error rates for 5 minutes
# If no errors, shift to 50%
kubectl patch virtualservice learning -n vibe-cast --type merge -p '
spec:
  http:
  - route:
    - destination:
        host: learning-service
        subset: v1
      weight: 50
    - destination:
        host: learning-service
        subset: v2
      weight: 50
'

# Monitor for 10 minutes, then shift to 100%
kubectl patch virtualservice learning -n vibe-cast --type merge -p '
spec:
  http:
  - route:
    - destination:
        host: learning-service
        subset: v2
      weight: 100
'
```

### Rollback on Error

```bash
# Automated: Prometheus alert triggers Istio rollback
# Manual: Instant traffic shift to v1
kubectl patch virtualservice learning -n vibe-cast --type merge -p '
spec:
  http:
  - route:
    - destination:
        host: learning-service
        subset: v1
      weight: 100
'
```

---

## Observability Stack

### Prometheus (Metrics)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
```

### Jaeger (Distributed Tracing)

```typescript
// Instrumentation in services
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('learning-service');

async function enrollLearner(learnerId: UUID, pathId: UUID) {
  const span = tracer.startSpan('enrollLearner', {
    attributes: {
      'learner.id': learnerId,
      'path.id': pathId,
      'service.name': 'learning-service'
    }
  });
  
  try {
    // Business logic
    const enrollment = await enrollmentRepo.create({ learnerId, pathId });
    
    // Publish event (Istio auto-traces gRPC/HTTP calls to other services)
    const eventSpan = tracer.startSpan('publishEvent', { parent: span });
    await eventBus.publish(new LearnerEnrolledEvent(enrollment));
    eventSpan.end();
    
    return enrollment;
  } finally {
    span.end();
  }
}
```

### Loki (Log Aggregation)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: monitoring
data:
  loki-config.yaml: |
    auth_enabled: false
    ingester:
      chunk_idle_period: 3m
      max_chunk_age: 1h
      chunk_retain_period: 1m
    limits_config:
      enforce_metric_name: false
      reject_old_samples: true
      reject_old_samples_max_age: 168h
    schema_config:
      configs:
      - from: 2020-10-24
        store: boltdb-shipper
        object_store: filesystem
        schema:
          prefix: index_
          version: v11
        index:
          prefix: index_
          period: 24h
```

---

## Security (mTLS & Network Policies)

```yaml
# Enable mTLS for entire namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: vibe-cast
spec:
  mtls:
    mode: STRICT  # All traffic must be mTLS encrypted

---
# Network Policy: Community → Metrics OK; Metrics → Learning DENY
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: metrics-ingress
  namespace: vibe-cast
spec:
  podSelector:
    matchLabels:
      app: metrics
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: community
    ports:
    - protocol: TCP
      port: 9090

---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: metrics-authz
  namespace: vibe-cast
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/vibe-cast/sa/community-service"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/metrics/*"]
```

---

## Failure Modes & Recovery

| Scenario | Detection | Recovery | RTO |
|----------|-----------|----------|-----|
| Pod crash | Liveness probe fails | Kubelet restarts pod | 30s |
| Service degradation | 5 consecutive 500-errors | Envoy ejects pod from LB | 30s |
| Slow pod (>2s latency) | Request timeout | Retry another pod | <1s |
| Node failure | Pod eviction | Reschedule to healthy node | 5min |
| RabbitMQ down | Connection timeout | Circuit breaker, local queue (memory) | Manual |
| PostgreSQL failure | DB connection error | Failover to standby (if replicated) | 1min |

---

## Configuration & GitOps

```bash
# Deploy with ArgoCD (GitOps)
# infrastructure/k8s/vibe-cast/values.yaml

vibe-cast:
  namespace: vibe-cast
  istio:
    enabled: true
    mTLS: STRICT
  
  services:
    learning:
      replicas: 3
      image: vibe-cast/learning:v1.0.0
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
    
    certification:
      replicas: 2
      image: vibe-cast/certification:v1.0.0
    
    skilllab:
      replicas: 2
      image: vibe-cast/skilllab:v1.0.0
    
    community:
      replicas: 2
      image: vibe-cast/community:v1.0.0
    
    metrics:
      replicas: 2
      image: vibe-cast/metrics:v1.0.0
  
  postgres:
    storageClass: vibe-cast-fast
    storage: 50Gi
  
  rabbitmq:
    replicas: 3
  
  redis:
    replicas: 1

# Deploy via Helm
helm install vibe-cast ./infrastructure/k8s/vibe-cast -n vibe-cast
```

---

## Consequences

### Positive
✅ **Auto-scaling:** HPA scales pods based on CPU/memory (1-10 replicas per service)  
✅ **Self-healing:** Kubelet restarts crashed pods automatically  
✅ **Zero-downtime deployments:** Canary rollouts prevent breaking changes  
✅ **mTLS by default:** All inter-service traffic encrypted  
✅ **Observability:** Distributed tracing, metrics, structured logs  

### Tradeoffs
⚠️ **Complexity:** Kubernetes, Istio, Prometheus learning curve  
⚠️ **Cost:** EKS $0.10/hour + nodes ($50+/month) = $200+/month  
⚠️ **Operational overhead:** Node patching, cluster upgrades, Istio version management  
⚠️ **Debugging harder:** Distributed system issues span multiple logs  

---

## Alternatives Considered

### 1. Docker Swarm
**Rejected:** Less ecosystem; difficult service discovery; poor observability.

### 2. Nomad (HashiCorp)
**Rejected:** Overkill for 15-20 containers; Kubernetes more familiar to team.

### 3. Self-hosted Kubernetes (kubeadm)
**Rejected:** Operational burden (etcd backup, API server HA, control plane updates).
Week 13 priority: delivery, not ops.

### 4. AWS ECS (proprietary container orchestration)
**Rejected:** Lock-in risk; Kubernetes more portable.

---

## Implementation Checklist (Week 13)

- [ ] Provision EKS/AKS cluster (3 worker nodes, t3.small minimum)
- [ ] Install Istio (1.17+) via helm
- [ ] Configure namespace with sidecar auto-injection
- [ ] Create Kubernetes Deployments (Learning, Certification, Lab, Community, Metrics)
- [ ] Create Kubernetes Services (internal DNS)
- [ ] Create Istio VirtualServices (traffic management, retries, circuit breaker)
- [ ] Create Istio DestinationRules (load balancing, outlier detection)
- [ ] Deploy StatefulSets (PostgreSQL, RabbitMQ, Redis)
- [ ] Create PersistentVolumeClaims (database storage)
- [ ] Set up Istio Ingress Gateway (HTTPS, JWT validation)
- [ ] Install Prometheus + Grafana (metrics dashboards)
- [ ] Install Jaeger (distributed tracing)
- [ ] Configure logging (Loki or ELK)
- [ ] Set up alerts (error rate > 5%, latency p99 > 500ms)
- [ ] Test canary deployments (v1 → v2 with traffic shift)
- [ ] Create runbooks (pod eviction, node failure, service degradation)
- [ ] Document cluster architecture (docs/KUBERNETES.md)

**Testing Strategy:**
```bash
# Chaos testing: Kill random pods
helm install chaos-monkey ./chaos/chaos-monkey -n vibe-cast

# Load test: 50 concurrent enrollment requests
k6 run tests/load/enrollments.js --vus 50 --duration 5m

# Chaos scenario: Delay 10% of certification requests
kubectl patch virtualservice certification -n vibe-cast --type merge -p '
spec:
  http:
  - fault:
      delay:
        percentage: 10.0
        fixedDelay: 5s
'

# Observe: Requests eventually succeed (Istio retries)
# Verify: Learning service circuit breaker ejects bad Certification pod after 5 errors
```

---

## Related Decisions
- **ADR-009:** EventBus design (RabbitMQ cluster)
- **ADR-011:** CQRS read models (ClickHouse, Elasticsearch StatefulSets)
- **ADR-010:** SAGA orchestration (distributed workflow coordination)

---

**Approved by:** Platform Lead  
**Date:** 2026-06-02  
**Review date:** 2026-10-02 (after Week 13 Kubernetes migration)
