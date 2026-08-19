<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Download, Files, Scissor } from '@element-plus/icons-vue'
import api,{errorText} from '../api'
const files=ref([]);const loading=ref(false)
function change(_file,list){files.value=list}
async function merge(){if(files.value.length<2)return ElMessage.warning('请至少选择2个PDF文件');loading.value=true;const fd=new FormData();files.value.forEach(f=>fd.append('files',f.raw));try{const res=await api.post('/pdf/merge',fd,{responseType:'blob'});const url=URL.createObjectURL(res.data);const a=document.createElement('a');a.href=url;a.download='合并文件.pdf';a.click();URL.revokeObjectURL(url);ElMessage.success('PDF合并完成')}catch(e){ElMessage.error(errorText(e))}finally{loading.value=false}}
</script><template><div class="page"><div class="page-title"><div><p class="eyebrow">UTILITY TOOLBOX</p><h1>文件百宝箱</h1><p>处理日常工作中常见的 PDF 合并与文件拆分需求</p></div></div><div class="tool-grid"><section class="panel tool-active"><div class="tool-title"><span><el-icon><Files/></el-icon></span><div><h2>PDF 文件合并</h2><p>按列表顺序将多个 PDF 合并为一个文件</p></div></div><el-upload drag multiple accept=".pdf" :auto-upload="false" :on-change="change" :on-remove="change"><el-icon class="el-icon--upload"><UploadFilled/></el-icon><div class="el-upload__text">拖拽多个 PDF 到此处，或<em>选择文件</em></div></el-upload><el-button type="primary" size="large" :icon="Download" :loading="loading" @click="merge">合并并下载</el-button></section><section class="panel tool-coming"><div class="tool-title"><span><el-icon><Scissor/></el-icon></span><div><h2>PDF 页面拆分</h2><p>按页码范围提取并生成独立文件</p></div></div><div class="coming-state"><b>功能接口已预留</b><p>后续可按业务需要增加单页拆分、范围拆分和批量命名规则。</p></div><el-button disabled>即将开放</el-button></section></div><div class="security-note"><b>文件安全说明</b><p>上传文件仅在本机后端临时处理，完成或失败后立即删除；请勿上传超出工作授权范围的材料。</p></div></div></template>

