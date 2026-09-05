import { progressStoreContract } from './progress-store.contract'
import { createMemoryProgressStore } from './memory-progress-store'

progressStoreContract('in-memory', createMemoryProgressStore)
