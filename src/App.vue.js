import { ref, onMounted } from 'vue';
import LoginForm from './components/LoginForm.vue';
import PasswordManager from './components/PasswordManager.vue';
const authKey = ref('');
onMounted(() => {
    const savedToken = localStorage.getItem('pm_token');
    if (savedToken) {
        authKey.value = savedToken;
    }
});
const handleLogin = (key) => {
    authKey.value = key;
    localStorage.setItem('pm_token', key);
};
const handleLogout = () => {
    authKey.value = '';
    localStorage.removeItem('pm_token');
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let ___VLS_components;
let ___VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-container" },
});
/** @type {__VLS_StyleScopedClasses['app-container']} */ ;
if (!__VLS_ctx.authKey) {
    /** @type {[typeof LoginForm, ]} */ ;
    // @ts-ignore
    LoginForm;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(LoginForm, new LoginForm({
        ...{ 'onLogin': {} },
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onLogin': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_4;
    const __VLS_5 = ({ login: {} },
        { onLogin: (__VLS_ctx.handleLogin) });
    // @ts-ignore
    [authKey, handleLogin,];
    var __VLS_2;
    var __VLS_3;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "main-layout" },
    });
    /** @type {__VLS_StyleScopedClasses['main-layout']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "top-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['top-bar']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "logo-area" },
    });
    /** @type {__VLS_StyleScopedClasses['logo-area']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "logo-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['logo-icon']} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "logo-text" },
    });
    /** @type {__VLS_StyleScopedClasses['logo-text']} */ ;
    const __VLS_7 = {}.ElButton;
    /** @type {[typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, typeof ___VLS_components.ElButton, typeof ___VLS_components.elButton, ]} */ ;
    // @ts-ignore
    ElButton;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        ...{ 'onClick': {} },
        type: "danger",
        plain: true,
        round: true,
        size: "small",
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onClick': {} },
        type: "danger",
        plain: true,
        round: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_12;
    const __VLS_13 = ({ click: {} },
        { onClick: (__VLS_ctx.handleLogout) });
    const { default: __VLS_14 } = __VLS_10.slots;
    // @ts-ignore
    [handleLogout,];
    var __VLS_10;
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "content-area" },
    });
    /** @type {__VLS_StyleScopedClasses['content-area']} */ ;
    /** @type {[typeof PasswordManager, ]} */ ;
    // @ts-ignore
    PasswordManager;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent(PasswordManager, new PasswordManager({
        authKey: (__VLS_ctx.authKey),
    }));
    const __VLS_16 = __VLS_15({
        authKey: (__VLS_ctx.authKey),
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    // @ts-ignore
    [authKey,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
