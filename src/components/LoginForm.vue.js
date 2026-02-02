import { ref, reactive } from 'vue';
import { Lock, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
const emit = defineEmits(['login']);
const isRegister = ref(false);
const loading = ref(false);
const form = reactive({
    username: '',
    password: ''
});
const handleSubmit = async () => {
    if (!form.username || !form.password) {
        ElMessage.warning('Please fill in all fields');
        return;
    }
    loading.value = true;
    try {
        const type = isRegister.value ? 'register' : 'login';
        const res = await axios.post('/api/auth', {
            type,
            username: form.username,
            password: form.password
        });
        if (res.data.success) {
            if (isRegister.value) {
                ElMessage.success('Registration successful! Please login.');
                isRegister.value = false;
                form.password = '';
            }
            else {
                ElMessage.success('Login successful');
                emit('login', res.data.data.token);
            }
        }
        else {
            ElMessage.error(res.data.message || 'Operation failed');
        }
    }
    catch (error) {
        ElMessage.error(error.response?.data?.message || 'Network error');
    }
    finally {
        loading.value = false;
    }
};
const toggleMode = () => {
    isRegister.value = !isRegister.value;
    form.username = '';
    form.password = '';
};
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let ___VLS_components;
let ___VLS_directives;
/** @type {__VLS_StyleScopedClasses['brand-header']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-header']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-container" },
});
/** @type {__VLS_StyleScopedClasses['login-container']} */ ;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-content" },
});
/** @type {__VLS_StyleScopedClasses['login-content']} */ ;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-header" },
});
/** @type {__VLS_StyleScopedClasses['brand-header']} */ ;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "logo-icon" },
});
/** @type {__VLS_StyleScopedClasses['logo-icon']} */ ;
__VLS_asFunctionalElement(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
const __VLS_0 = {}.ElCard;
/** @type {[typeof ___VLS_components.ElCard, typeof ___VLS_components.elCard, typeof ___VLS_components.ElCard, typeof ___VLS_components.elCard, ]} */ ;
// @ts-ignore
ElCard;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "login-card" },
    shadow: "always",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "login-card" },
    shadow: "always",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
{
    const { header: __VLS_6 } = __VLS_3.slots;
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "card-header" },
    });
    /** @type {__VLS_StyleScopedClasses['card-header']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.isRegister ? 'Create Account' : 'Welcome Back');
    // @ts-ignore
    [isRegister,];
}
const __VLS_7 = {}.ElForm;
/** @type {[typeof ___VLS_components.ElForm, typeof ___VLS_components.elForm, typeof ___VLS_components.ElForm, typeof ___VLS_components.elForm, ]} */ ;
// @ts-ignore
ElForm;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    ...{ 'onSubmit': {} },
    size: "large",
    ...{ class: "login-form" },
}));
const __VLS_9 = __VLS_8({
    ...{ 'onSubmit': {} },
    size: "large",
    ...{ class: "login-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
let __VLS_12;
const __VLS_13 = ({ submit: {} },
    { onSubmit: (__VLS_ctx.handleSubmit) });
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
const { default: __VLS_14 } = __VLS_10.slots;
const __VLS_15 = {}.ElFormItem;
/** @type {[typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, ]} */ ;
// @ts-ignore
ElFormItem;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({}));
const __VLS_17 = __VLS_16({}, ...__VLS_functionalComponentArgsRest(__VLS_16));
const { default: __VLS_20 } = __VLS_18.slots;
const __VLS_21 = {}.ElInput;
/** @type {[typeof ___VLS_components.ElInput, typeof ___VLS_components.elInput, ]} */ ;
// @ts-ignore
ElInput;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    modelValue: (__VLS_ctx.form.username),
    placeholder: "Username",
    prefixIcon: (__VLS_ctx.User),
}));
const __VLS_23 = __VLS_22({
    modelValue: (__VLS_ctx.form.username),
    placeholder: "Username",
    prefixIcon: (__VLS_ctx.User),
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
// @ts-ignore
[handleSubmit, form, User,];
// @ts-ignore
[];
var __VLS_18;
const __VLS_27 = {}.ElFormItem;
/** @type {[typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, ]} */ ;
// @ts-ignore
ElFormItem;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({}));
const __VLS_29 = __VLS_28({}, ...__VLS_functionalComponentArgsRest(__VLS_28));
const { default: __VLS_32 } = __VLS_30.slots;
const __VLS_33 = {}.ElInput;
/** @type {[typeof ___VLS_components.ElInput, typeof ___VLS_components.elInput, ]} */ ;
// @ts-ignore
ElInput;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "Password",
    prefixIcon: (__VLS_ctx.Lock),
    showPassword: true,
}));
const __VLS_35 = __VLS_34({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    placeholder: "Password",
    prefixIcon: (__VLS_ctx.Lock),
    showPassword: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
let __VLS_38;
const __VLS_39 = ({ keyup: {} },
    { onKeyup: (__VLS_ctx.handleSubmit) });
// @ts-ignore
[handleSubmit, form, Lock,];
var __VLS_36;
var __VLS_37;
// @ts-ignore
[];
var __VLS_30;
const __VLS_41 = {}.ElFormItem;
/** @type {[typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, typeof ___VLS_components.ElFormItem, typeof ___VLS_components.elFormItem, ]} */ ;
// @ts-ignore
ElFormItem;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({}));
const __VLS_43 = __VLS_42({}, ...__VLS_functionalComponentArgsRest(__VLS_42));
const { default: __VLS_46 } = __VLS_44.slots;
const __VLS_47 = {}.ElButton;
/** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
// @ts-ignore
ElButton;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
    ...{ 'onClick': {} },
    type: "primary",
    ...{ class: "w-100 submit-btn" },
    loading: (__VLS_ctx.loading),
}));
const __VLS_49 = __VLS_48({
    ...{ 'onClick': {} },
    type: "primary",
    ...{ class: "w-100 submit-btn" },
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
let __VLS_52;
const __VLS_53 = ({ click: {} },
    { onClick: (__VLS_ctx.handleSubmit) });
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
const { default: __VLS_54 } = __VLS_50.slots;
(__VLS_ctx.isRegister ? 'Sign Up' : 'Sign In');
// @ts-ignore
[isRegister, handleSubmit, loading,];
var __VLS_50;
var __VLS_51;
// @ts-ignore
[];
var __VLS_44;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "text-center" },
});
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
const __VLS_55 = {}.ElButton;
/** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
// @ts-ignore
ElButton;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}));
const __VLS_57 = __VLS_56({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
let __VLS_60;
const __VLS_61 = ({ click: {} },
    { onClick: (__VLS_ctx.toggleMode) });
const { default: __VLS_62 } = __VLS_58.slots;
(__VLS_ctx.isRegister ? 'Already have an account? Sign In' : 'New here? Create Account');
// @ts-ignore
[isRegister, toggleMode,];
var __VLS_58;
var __VLS_59;
// @ts-ignore
[];
var __VLS_10;
var __VLS_11;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    emits: {},
});
export default {};
