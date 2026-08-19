import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  ElAlert, ElButton, ElCheckbox, ElCheckboxGroup, ElCollapse, ElCollapseItem,
  ElDatePicker, ElDialog, ElDrawer, ElEmpty, ElForm, ElFormItem, ElIcon, ElInput,
  ElInputNumber, ElOption, ElProgress, ElRadioButton, ElRadioGroup, ElSegmented,
  ElSelect, ElSlider, ElTable, ElTableColumn, ElTag, ElTimeSelect, ElTimeline,
  ElTimelineItem, ElUpload
} from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router.js'
import './styles.css'

const app = createApp(App)
const components = [
  ElAlert, ElButton, ElCheckbox, ElCheckboxGroup, ElCollapse, ElCollapseItem,
  ElDatePicker, ElDialog, ElDrawer, ElEmpty, ElForm, ElFormItem, ElIcon, ElInput,
  ElInputNumber, ElOption, ElProgress, ElRadioButton, ElRadioGroup, ElSegmented,
  ElSelect, ElSlider, ElTable, ElTableColumn, ElTag, ElTimeSelect, ElTimeline,
  ElTimelineItem, ElUpload
]
components.forEach(component => app.component(component.name, component))
app.use(createPinia()).use(router).mount('#app')

