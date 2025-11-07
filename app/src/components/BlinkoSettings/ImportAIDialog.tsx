import { observer } from 'mobx-react-lite';
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RootStore } from '@/store';
import { BlinkoStore } from '@/store/blinkoStore';
import { PromiseCall } from '@/store/standard/PromiseState';
import { api } from '@/lib/trpc';
import { useTranslation } from 'react-i18next';
import { ToastPlugin } from '@/store/module/Toast/Toast';
import { Icon } from '@/components/Common/Iconify/icons';

interface AIConfig {
    baseUrl?: string;
    apiKey?: string;
    llmModel?: string;
    embeddingModel?: string;
    embeddingDimensions?: number;
}

export const ImportAIDialog = observer(({ onSelectTab }: { onSelectTab?: (tab: string) => void } = {}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const blinko = RootStore.Get(BlinkoStore);
    const toast = RootStore.Get(ToastPlugin);
    const { t } = useTranslation();

    useEffect(() => {
        const encodedConfig = searchParams.get('v');
        if (encodedConfig) {
            try {
                const decodedConfig = JSON.parse(atob(encodedConfig));
                setAiConfig(decodedConfig);
                setIsOpen(true);

                if (onSelectTab) {
                    onSelectTab('ai');
                }
            } catch (error) {
                console.error('Failed to parse AI config:', error);
            }
        }
    }, [searchParams, onSelectTab]);

    const handleConfirm = async () => {
        if (!aiConfig) return;
        console.log(aiConfig);
        if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.llmModel || !aiConfig.embeddingModel || !aiConfig.embeddingDimensions) {
            toast.error(t('incomplete-ai-configuration'));
            return;
        }

        try {
            setIsLoading(true);
            
            await PromiseCall(
                Promise.all([
                    api.config.update.mutate({
                        key: 'isUseAI',
                        value: true,
                    }),

                    api.config.update.mutate({
                        key: 'aiModelProvider',
                        value: 'OpenAI',
                    }),

                    api.config.update.mutate({
                        key: 'aiApiEndpoint',
                        value: aiConfig.baseUrl,
                    }),

                    api.config.update.mutate({
                        key: 'aiApiKey',
                        value: aiConfig.apiKey,
                    }),

                    api.config.update.mutate({
                        key: 'aiModel',
                        value: aiConfig.llmModel,
                    }),

                    api.config.update.mutate({
                        key: 'embeddingModel',
                        value: aiConfig.embeddingModel,
                    }),

                    api.config.update.mutate({
                        key: 'embeddingDimensions',
                        value: aiConfig.embeddingDimensions,
                    }),
                ]),
                { autoAlert: false }
            );
            
            toast.success(t('operation-success'));
            searchParams.delete('v');
            setSearchParams(searchParams);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to import AI config:', error);
            toast.error(t('operation-failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        searchParams.delete('v');
        setSearchParams(searchParams);
        setIsOpen(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={handleCancel} placement="center" size="md">
            <ModalContent className="rounded-lg">
                <ModalHeader className="flex items-center gap-2 pb-3">
                    <div className="flex items-center gap-2">
                        <Icon icon="hugeicons:ai-magic" className="text-primary" width={24} height={24} />
                        <span className="text-lg font-semibold">{t('import-ai-configuration')}</span>
                    </div>
                </ModalHeader>
                <ModalBody className="py-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon icon="fluent:info-24-filled" className="text-primary" width={20} height={20} />
                            <p className="text-base">{t('detected-ai-configuration-to-import')}</p>
                        </div>
                        
                        {aiConfig && (
                            <div className="bg-default-50 border border-default-200 p-4 rounded-xl">
                                {aiConfig.baseUrl && (
                                    <div className="flex flex-col mb-3">
                                        <span className="text-sm font-medium text-default-600">{t('api-endpoint')}:</span>
                                        <span className="text-sm font-semibold mt-1 p-2 bg-default-100 rounded-md">{aiConfig.baseUrl}</span>
                                    </div>
                                )}
                                {aiConfig.apiKey && (
                                    <div className="flex flex-col mb-3">
                                        <span className="text-sm font-medium text-default-600">API Key:</span>
                                        <span className="text-sm font-semibold mt-1 p-2 bg-default-100 rounded-md">{'•'.repeat(16)}</span>
                                    </div>
                                )}
                                {aiConfig.llmModel && (
                                    <div className="flex flex-col mb-3">
                                        <span className="text-sm font-medium text-default-600">{t('model')}:</span>
                                        <span className="text-sm font-semibold mt-1 p-2 bg-default-100 rounded-md">{aiConfig.llmModel}</span>
                                    </div>
                                )}
                                {aiConfig.embeddingModel && (
                                    <div className="flex flex-col mb-3">
                                        <span className="text-sm font-medium text-default-600">{t('embedding-model')}:</span>
                                        <span className="text-sm font-semibold mt-1 p-2 bg-default-100 rounded-md">{aiConfig.embeddingModel}</span>
                                    </div>
                                )}
                                {aiConfig.embeddingDimensions && (
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-default-600">{t('embedding-dimensions')}:</span>
                                        <span className="text-sm font-semibold mt-1 p-2 bg-default-100 rounded-md">{aiConfig.embeddingDimensions}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                            <Icon icon="mdi:help-circle-outline" className="text-warning" width={20} height={20} />
                            <p className="text-base">{t('would-you-like-to-import-this-configuration')}</p>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter className="pt-3">
                    <Button 
                        color="danger" 
                        variant="flat" 
                        onPress={handleCancel} 
                        className="px-6"
                        isDisabled={isLoading}
                    >
                        {t('cancel')}
                    </Button>
                    <Button 
                        color="primary" 
                        onPress={handleConfirm} 
                        className="px-6" 
                        startContent={isLoading ? null : <Icon icon="material-symbols:download" width={18} height={18} />}
                        isLoading={isLoading}
                        spinner={<Icon icon="line-md:loading-twotone-loop" width={24} height={24} />}
                    >
                        {isLoading ? t('importing') : t('import')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
});
