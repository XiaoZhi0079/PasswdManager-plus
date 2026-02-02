import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, CopyDocument, Refresh, Search, View, Hide } from '@element-plus/icons-vue';
import axios from 'axios';
const props = defineProps();
const items = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogType = ref('add');
const formRef = ref();
const searchQuery = ref('');
const visiblePasswords = reactive({});
const form = reactive({
    platform: '',
    account: '',
    password: '',
    remark: ''
});
const currentId = ref('');
const rules = reactive({
    platform: [{ required: true, message: 'Please input platform name', trigger: 'blur' }],
    account: [{ required: true, message: 'Please input account', trigger: 'blur' }],
    password: [{ required: true, message: 'Please input password', trigger: 'blur' }]
});
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Authorization': `Bearer ${props.authKey}`
    }
});
const fetchData = async () => {
    loading.value = true;
    try {
        const res = await api.get('/passwords');
        if (res.data.success && res.data.data) {
            items.value = res.data.data;
        }
        else {
            ElMessage.error(res.data.message || 'Failed to fetch data');
        }
    }
    catch (error) {
        if (error.response?.status === 401) {
            ElMessage.error('Session expired, please login again');
            // Ideally emit logout event
        }
        else {
            ElMessage.error('Network error');
        }
    }
    finally {
        loading.value = false;
    }
};
const filteredItems = computed(() => {
    if (!searchQuery.value)
        return items.value;
    const query = searchQuery.value.toLowerCase();
    return items.value.filter(item => item.platform.toLowerCase().includes(query) ||
        item.account.toLowerCase().includes(query) ||
        item.remark.toLowerCase().includes(query));
});
const togglePasswordVisibility = (id) => {
    visiblePasswords[id] = !visiblePasswords[id];
};
const handleAdd = () => {
    dialogType.value = 'add';
    currentId.value = '';
    form.platform = '';
    form.account = '';
    form.password = '';
    form.remark = '';
    dialogVisible.value = true;
};
const handleEdit = (row) => {
    dialogType.value = 'edit';
    currentId.value = row.id;
    form.platform = row.platform;
    form.account = row.account;
    form.password = row.password;
    form.remark = row.remark;
    dialogVisible.value = true;
};
const handleDelete = (row) => {
    ElMessageBox.confirm('Are you sure you want to delete this item?', 'Warning', {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
    }).then(async () => {
        try {
            const res = await api.delete('/passwords', { data: { id: row.id } });
            if (res.data.success) {
                ElMessage.success('Deleted successfully');
                fetchData();
            }
            else {
                ElMessage.error(res.data.message || 'Delete failed');
            }
        }
        catch (error) {
            ElMessage.error('Error deleting item');
        }
    });
};
const submitForm = async (formEl) => {
    if (!formEl)
        return;
    await formEl.validate(async (valid, fields) => {
        if (valid) {
            try {
                const payload = { ...form, id: currentId.value };
                const method = dialogType.value === 'add' ? 'post' : 'put';
                const res = await api[method]('/passwords', payload);
                if (res.data.success) {
                    ElMessage.success(dialogType.value === 'add' ? 'Added successfully' : 'Updated successfully');
                    dialogVisible.value = false;
                    fetchData();
                }
                else {
                    ElMessage.error(res.data.message || 'Operation failed');
                }
            }
            catch (error) {
                ElMessage.error('Error submitting form');
            }
        }
    });
};
const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        ElMessage.success('Password copied to clipboard');
    }).catch(() => {
        ElMessage.error('Failed to copy');
    });
};
onMounted(() => {
    fetchData();
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let ___VLS_components;
let ___VLS_directives;
/** @type {__VLS_StyleScopedClasses['password-card']} */ ;
/** @type {__VLS_StyleScopedClasses['more-icon']} */ ;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "manager-container" },
});
/** @type {__VLS_StyleScopedClasses['manager-container']} */ ;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-actions" },
});
/** @type {__VLS_StyleScopedClasses['header-actions']} */ ;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "search-box" },
});
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
const __VLS_0 = {}.ElInput;
/** @type {[typeof ___VLS_components.ElInput, typeof ___VLS_components.elInput, ]} */ ;
// @ts-ignore
ElInput;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: "Search passwords...",
    prefixIcon: (__VLS_ctx.Search),
    size: "large",
    clearable: true,
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: "Search passwords...",
    prefixIcon: (__VLS_ctx.Search),
    size: "large",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
// @ts-ignore
[searchQuery, Search,];
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "buttons" },
});
/** @type {__VLS_StyleScopedClasses['buttons']} */ ;
const __VLS_6 = {}.ElButton;
/** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
// @ts-ignore
ElButton;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Refresh),
    circle: true,
    size: "large",
}));
const __VLS_8 = __VLS_7({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Refresh),
    circle: true,
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
let __VLS_11;
const __VLS_12 = ({ click: {} },
    { onClick: (__VLS_ctx.fetchData) });
// @ts-ignore
[Refresh, fetchData,];
var __VLS_9;
var __VLS_10;
const __VLS_14 = {}.ElButton;
/** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
// @ts-ignore
ElButton;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
    size: "large",
}));
const __VLS_16 = __VLS_15({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
let __VLS_19;
const __VLS_20 = ({ click: {} },
    { onClick: (__VLS_ctx.handleAdd) });
const { default: __VLS_21 } = __VLS_17.slots;
// @ts-ignore
[Plus, handleAdd,];
var __VLS_17;
var __VLS_18;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "content-wrapper" },
});
__VLS_asFunctionalDirective(___VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
/** @type {__VLS_StyleScopedClasses['content-wrapper']} */ ;
const __VLS_22 = {}.ElRow;
/** @type {[typeof ___VLS_components.ElRow, typeof ___VLS_components.elRow, typeof ___VLS_components.ElRow, typeof ___VLS_components.elRow, ]} */ ;
// @ts-ignore
ElRow;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    gutter: (24),
}));
const __VLS_24 = __VLS_23({
    gutter: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
const { default: __VLS_27 } = __VLS_25.slots;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredItems))) {
    const __VLS_28 = {}.ElCol;
    /** @type {[typeof ___VLS_components.ElCol, typeof ___VLS_components.elCol, typeof ___VLS_components.ElCol, typeof ___VLS_components.elCol, ]} */ ;
    // @ts-ignore
    ElCol;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        xs: (24),
        sm: (12),
        md: (8),
        lg: (6),
        key: (item.id),
        ...{ class: "mb-4" },
    }));
    const __VLS_30 = __VLS_29({
        xs: (24),
        sm: (12),
        md: (8),
        lg: (6),
        key: (item.id),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
    const { default: __VLS_33 } = __VLS_31.slots;
    const __VLS_34 = {}.ElCard;
    /** @type {[typeof ___VLS_components.ElCard, typeof ___VLS_components.elCard, typeof ___VLS_components.ElCard, typeof ___VLS_components.elCard, ]} */ ;
    // @ts-ignore
    ElCard;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
        shadow: "hover",
        ...{ class: "password-card" },
    }));
    const __VLS_36 = __VLS_35({
        shadow: "hover",
        ...{ class: "password-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    /** @type {__VLS_StyleScopedClasses['password-card']} */ ;
    const { default: __VLS_39 } = __VLS_37.slots;
    {
        const { header: __VLS_40 } = __VLS_37.slots;
        __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "card-header" },
        });
        /** @type {__VLS_StyleScopedClasses['card-header']} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "platform-info" },
        });
        /** @type {__VLS_StyleScopedClasses['platform-info']} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "platform-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['platform-icon']} */ ;
        (item.platform.charAt(0).toUpperCase());
        __VLS_asFunctionalElement(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "platform-name" },
            title: (item.platform),
        });
        /** @type {__VLS_StyleScopedClasses['platform-name']} */ ;
        (item.platform);
        const __VLS_41 = {}.ElDropdown;
        /** @type {[typeof ___VLS_components.ElDropdown, typeof ___VLS_components.elDropdown, typeof ___VLS_components.ElDropdown, typeof ___VLS_components.elDropdown, ]} */ ;
        // @ts-ignore
        ElDropdown;
        // @ts-ignore
        const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
            trigger: "click",
        }));
        const __VLS_43 = __VLS_42({
            trigger: "click",
        }, ...__VLS_functionalComponentArgsRest(__VLS_42));
        const { default: __VLS_46 } = __VLS_44.slots;
        __VLS_asFunctionalElement(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "el-dropdown-link" },
        });
        /** @type {__VLS_StyleScopedClasses['el-dropdown-link']} */ ;
        const __VLS_47 = {}.ElIcon;
        /** @type {[typeof ___VLS_components.ElIcon, typeof ___VLS_components.elIcon, typeof ___VLS_components.ElIcon, typeof ___VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        ElIcon;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
            ...{ class: "more-icon" },
        }));
        const __VLS_49 = __VLS_48({
            ...{ class: "more-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_48));
        /** @type {__VLS_StyleScopedClasses['more-icon']} */ ;
        const { default: __VLS_52 } = __VLS_50.slots;
        const __VLS_53 = {}.Edit;
        /** @type {[typeof ___VLS_components.Edit, ]} */ ;
        // @ts-ignore
        Edit;
        // @ts-ignore
        const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({}));
        const __VLS_55 = __VLS_54({}, ...__VLS_functionalComponentArgsRest(__VLS_54));
        // @ts-ignore
        [vLoading, loading, filteredItems,];
        // @ts-ignore
        [];
        var __VLS_50;
        {
            const { dropdown: __VLS_59 } = __VLS_44.slots;
            const __VLS_60 = {}.ElDropdownMenu;
            /** @type {[typeof ___VLS_components.ElDropdownMenu, typeof ___VLS_components.elDropdownMenu, typeof ___VLS_components.ElDropdownMenu, typeof ___VLS_components.elDropdownMenu, ]} */ ;
            // @ts-ignore
            ElDropdownMenu;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({}));
            const __VLS_62 = __VLS_61({}, ...__VLS_functionalComponentArgsRest(__VLS_61));
            const { default: __VLS_65 } = __VLS_63.slots;
            const __VLS_66 = {}.ElDropdownItem;
            /** @type {[typeof ___VLS_components.ElDropdownItem, typeof ___VLS_components.elDropdownItem, typeof ___VLS_components.ElDropdownItem, typeof ___VLS_components.elDropdownItem, ]} */ ;
            // @ts-ignore
            ElDropdownItem;
            // @ts-ignore
            const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.Edit),
            }));
            const __VLS_68 = __VLS_67({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.Edit),
            }, ...__VLS_functionalComponentArgsRest(__VLS_67));
            let __VLS_71;
            const __VLS_72 = ({ click: {} },
                { onClick: (...[$event]) => {
                        __VLS_ctx.handleEdit(item);
                        // @ts-ignore
                        [Edit, handleEdit,];
                    } });
            const { default: __VLS_73 } = __VLS_69.slots;
            // @ts-ignore
            [];
            var __VLS_69;
            var __VLS_70;
            const __VLS_74 = {}.ElDropdownItem;
            /** @type {[typeof ___VLS_components.ElDropdownItem, typeof ___VLS_components.elDropdownItem, typeof ___VLS_components.ElDropdownItem, typeof ___VLS_components.elDropdownItem, ]} */ ;
            // @ts-ignore
            ElDropdownItem;
            // @ts-ignore
            const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.Delete),
                ...{ class: "text-danger" },
            }));
            const __VLS_76 = __VLS_75({
                ...{ 'onClick': {} },
                icon: (__VLS_ctx.Delete),
                ...{ class: "text-danger" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_75));
            let __VLS_79;
            const __VLS_80 = ({ click: {} },
                { onClick: (...[$event]) => {
                        __VLS_ctx.handleDelete(item);
                        // @ts-ignore
                        [Delete, handleDelete,];
                    } });
            /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
            const { default: __VLS_81 } = __VLS_77.slots;
            // @ts-ignore
            [];
            var __VLS_77;
            var __VLS_78;
            // @ts-ignore
            [];
            var __VLS_63;
            // @ts-ignore
            [];
        }
        // @ts-ignore
        [];
        var __VLS_44;
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "card-content" },
    });
    /** @type {__VLS_StyleScopedClasses['card-content']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-group" },
    });
    /** @type {__VLS_StyleScopedClasses['info-group']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "value-row" },
    });
    /** @type {__VLS_StyleScopedClasses['value-row']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-value" },
    });
    /** @type {__VLS_StyleScopedClasses['text-value']} */ ;
    (item.account);
    const __VLS_82 = {}.ElButton;
    /** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
    // @ts-ignore
    ElButton;
    // @ts-ignore
    const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        icon: (__VLS_ctx.CopyDocument),
    }));
    const __VLS_84 = __VLS_83({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        icon: (__VLS_ctx.CopyDocument),
    }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    let __VLS_87;
    const __VLS_88 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.copyToClipboard(item.account);
                // @ts-ignore
                [CopyDocument, copyToClipboard,];
            } });
    // @ts-ignore
    [];
    var __VLS_85;
    var __VLS_86;
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "info-group" },
    });
    /** @type {__VLS_StyleScopedClasses['info-group']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "value-row" },
    });
    /** @type {__VLS_StyleScopedClasses['value-row']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-value password-text" },
    });
    /** @type {__VLS_StyleScopedClasses['text-value']} */ ;
    /** @type {__VLS_StyleScopedClasses['password-text']} */ ;
    (__VLS_ctx.visiblePasswords[item.id] ? item.password : '••••••••');
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "actions" },
    });
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    const __VLS_90 = {}.ElButton;
    /** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
    // @ts-ignore
    ElButton;
    // @ts-ignore
    const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
        icon: (__VLS_ctx.visiblePasswords[item.id] ? __VLS_ctx.Hide : __VLS_ctx.View),
    }));
    const __VLS_92 = __VLS_91({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
        icon: (__VLS_ctx.visiblePasswords[item.id] ? __VLS_ctx.Hide : __VLS_ctx.View),
    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
    let __VLS_95;
    const __VLS_96 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.togglePasswordVisibility(item.id);
                // @ts-ignore
                [visiblePasswords, visiblePasswords, Hide, View, togglePasswordVisibility,];
            } });
    // @ts-ignore
    [];
    var __VLS_93;
    var __VLS_94;
    const __VLS_98 = {}.ElButton;
    /** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
    // @ts-ignore
    ElButton;
    // @ts-ignore
    const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        icon: (__VLS_ctx.CopyDocument),
    }));
    const __VLS_100 = __VLS_99({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        icon: (__VLS_ctx.CopyDocument),
    }, ...__VLS_functionalComponentArgsRest(__VLS_99));
    let __VLS_103;
    const __VLS_104 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.copyToClipboard(item.password);
                // @ts-ignore
                [CopyDocument, copyToClipboard,];
            } });
    // @ts-ignore
    [];
    var __VLS_101;
    var __VLS_102;
    if (item.remark) {
        __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "info-group" },
        });
        /** @type {__VLS_StyleScopedClasses['info-group']} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "remark-text" },
        });
        /** @type {__VLS_StyleScopedClasses['remark-text']} */ ;
        (item.remark);
    }
    // @ts-ignore
    [];
    var __VLS_37;
    // @ts-ignore
    [];
    var __VLS_31;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_25;
if (!__VLS_ctx.loading && __VLS_ctx.filteredItems.length === 0) {
    const __VLS_106 = {}.ElEmpty;
    /** @type {[typeof ___VLS_components.ElEmpty, typeof ___VLS_components.elEmpty, typeof ___VLS_components.ElEmpty, typeof ___VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    ElEmpty;
    // @ts-ignore
    const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
        description: "No passwords found",
    }));
    const __VLS_108 = __VLS_107({
        description: "No passwords found",
    }, ...__VLS_functionalComponentArgsRest(__VLS_107));
    const { default: __VLS_111 } = __VLS_109.slots;
    const __VLS_112 = {}.ElButton;
    /** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
    // @ts-ignore
    ElButton;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_114 = __VLS_113({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    let __VLS_117;
    const __VLS_118 = ({ click: {} },
        { onClick: (__VLS_ctx.handleAdd) });
    const { default: __VLS_119 } = __VLS_115.slots;
    // @ts-ignore
    [handleAdd, loading, filteredItems,];
    var __VLS_115;
    var __VLS_116;
    // @ts-ignore
    [];
    var __VLS_109;
}
const __VLS_120 = {}.ElDialog;
/** @type {[typeof ___VLS_components.ElDialog, typeof ___VLS_components.elDialog, typeof ___VLS_components.ElDialog, typeof ___VLS_components.elDialog, ]} */ ;
// @ts-ignore
ElDialog;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.dialogType === 'add' ? 'Add Password' : 'Edit Password'),
    width: "500px",
    destroyOnClose: true,
    ...{ class: "custom-dialog" },
}));
const __VLS_122 = __VLS_121({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.dialogType === 'add' ? 'Add Password' : 'Edit Password'),
    width: "500px",
    destroyOnClose: true,
    ...{ class: "custom-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
/** @type {__VLS_StyleScopedClasses['custom-dialog']} */ ;
const { default: __VLS_125 } = __VLS_123.slots;
const __VLS_126 = {}.ElForm;
/** @type {[typeof ___VLS_components.ElForm, typeof ___VLS_components.elForm, typeof ___VLS_components.ElForm, typeof ___VLS_components.elForm, ]} */ ;
// @ts-ignore
ElForm;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
    size: "large",
}));
const __VLS_128 = __VLS_127({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
var __VLS_131 = {};
const { default: __VLS_133 } = __VLS_129.slots;
const __VLS_134 = {}.ElFormItem;
/** @type {[typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, ]} */ ;
// @ts-ignore
ElFormItem;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
    label: "Platform Name",
    prop: "platform",
}));
const __VLS_136 = __VLS_135({
    label: "Platform Name",
    prop: "platform",
}, ...__VLS_functionalComponentArgsRest(__VLS_135));
const { default: __VLS_139 } = __VLS_137.slots;
const __VLS_140 = {}.ElInput;
/** @type {[typeof ___VLS_components.ElInput, typeof ___VLS_components.elInput, ]} */ ;
// @ts-ignore
ElInput;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    modelValue: (__VLS_ctx.form.platform),
    placeholder: "e.g. Google, Netflix",
}));
const __VLS_142 = __VLS_141({
    modelValue: (__VLS_ctx.form.platform),
    placeholder: "e.g. Google, Netflix",
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
// @ts-ignore
[dialogVisible, dialogType, form, form, rules,];
// @ts-ignore
[];
var __VLS_137;
const __VLS_146 = {}.ElFormItem;
/** @type {[typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, ]} */ ;
// @ts-ignore
ElFormItem;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
    label: "Account / Email",
    prop: "account",
}));
const __VLS_148 = __VLS_147({
    label: "Account / Email",
    prop: "account",
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
const { default: __VLS_151 } = __VLS_149.slots;
const __VLS_152 = {}.ElInput;
/** @type {[typeof ___VLS_components.ElInput, typeof ___VLS_components.elInput, ]} */ ;
// @ts-ignore
ElInput;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    modelValue: (__VLS_ctx.form.account),
    placeholder: "username@example.com",
}));
const __VLS_154 = __VLS_153({
    modelValue: (__VLS_ctx.form.account),
    placeholder: "username@example.com",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
// @ts-ignore
[form,];
// @ts-ignore
[];
var __VLS_149;
const __VLS_158 = {}.ElFormItem;
/** @type {[typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, ]} */ ;
// @ts-ignore
ElFormItem;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
    label: "Password",
    prop: "password",
}));
const __VLS_160 = __VLS_159({
    label: "Password",
    prop: "password",
}, ...__VLS_functionalComponentArgsRest(__VLS_159));
const { default: __VLS_163 } = __VLS_161.slots;
const __VLS_164 = {}.ElInput;
/** @type {[typeof ___VLS_components.ElInput, typeof ___VLS_components.elInput, ]} */ ;
// @ts-ignore
ElInput;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    modelValue: (__VLS_ctx.form.password),
    showPassword: true,
    placeholder: "Enter password",
}));
const __VLS_166 = __VLS_165({
    modelValue: (__VLS_ctx.form.password),
    showPassword: true,
    placeholder: "Enter password",
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
// @ts-ignore
[form,];
// @ts-ignore
[];
var __VLS_161;
const __VLS_170 = {}.ElFormItem;
/** @type {[typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, ]} */ ;
// @ts-ignore
ElFormItem;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    label: "Notes (Optional)",
    prop: "remark",
}));
const __VLS_172 = __VLS_171({
    label: "Notes (Optional)",
    prop: "remark",
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
const { default: __VLS_175 } = __VLS_173.slots;
const __VLS_176 = {}.ElInput;
/** @type {[typeof ___VLS_components.ElInput, typeof ___VLS_components.elInput, ]} */ ;
// @ts-ignore
ElInput;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    modelValue: (__VLS_ctx.form.remark),
    type: "textarea",
    rows: (3),
    placeholder: "Any additional details...",
}));
const __VLS_178 = __VLS_177({
    modelValue: (__VLS_ctx.form.remark),
    type: "textarea",
    rows: (3),
    placeholder: "Any additional details...",
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
// @ts-ignore
[form,];
// @ts-ignore
[];
var __VLS_173;
// @ts-ignore
[];
var __VLS_129;
{
    const { footer: __VLS_182 } = __VLS_123.slots;
    __VLS_asFunctionalElement(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "dialog-footer" },
    });
    /** @type {__VLS_StyleScopedClasses['dialog-footer']} */ ;
    const __VLS_183 = {}.ElButton;
    /** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
    // @ts-ignore
    ElButton;
    // @ts-ignore
    const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
        ...{ 'onClick': {} },
    }));
    const __VLS_185 = __VLS_184({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_184));
    let __VLS_188;
    const __VLS_189 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.dialogVisible = false;
                // @ts-ignore
                [dialogVisible,];
            } });
    const { default: __VLS_190 } = __VLS_186.slots;
    // @ts-ignore
    [];
    var __VLS_186;
    var __VLS_187;
    const __VLS_191 = {}.ElButton;
    /** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
    // @ts-ignore
    ElButton;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_193 = __VLS_192({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
    let __VLS_196;
    const __VLS_197 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.submitForm(__VLS_ctx.formRef);
                // @ts-ignore
                [submitForm, formRef,];
            } });
    const { default: __VLS_198 } = __VLS_194.slots;
    // @ts-ignore
    [];
    var __VLS_194;
    var __VLS_195;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_123;
// @ts-ignore
var __VLS_132 = __VLS_131;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
