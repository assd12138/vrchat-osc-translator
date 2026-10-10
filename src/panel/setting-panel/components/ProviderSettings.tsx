import { Button, Card, Chip } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/ui";
import {
  type ApiProvider,
  createApiProvider,
  createModel,
  isProviderIdentifierAvailable,
  ModelType,
} from "@/store/api-config";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { removeProvider, upsertProvider } from "@/store/settings";
import ProviderEditor from "./ProviderEditor";

export default function ProviderSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const providers = useAppSelector((s) => s.settings.apiConfig.providers);
  const [editing, setEditing] = useState<ApiProvider | null>(null);
  const copy = (provider: ApiProvider) => {
    let n = 1;
    let identifier = `${provider.identifier}-copy`;
    while (!isProviderIdentifierAvailable(identifier, providers))
      identifier = `${provider.identifier}-copy-${++n}`;
    const copiedModels = provider.models.map((model) =>
      createModel({
        modelId: model.modelId,
        type: model.type,
        capabilities:
          model.type === ModelType.CHAT_COMPLETION ? model.capabilities : {},
      }),
    );
    const copiedProvider = createApiProvider();
    dispatch(
      upsertProvider({
        ...copiedProvider,
        identifier,
        baseURL: provider.baseURL,
        apiKey: provider.apiKey,
        models: copiedModels,
      }),
    );
  };
  return (
    <>
      {editing ? (
        <ProviderEditor
          key={editing.uid}
          provider={editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <>
          <div className="toolbar between">
            <span className="text-muted">
              {t("供应商列表")} · {providers.length}
            </span>
            <Button onPress={() => setEditing(createApiProvider())}>
              + {t("新建供应商")}
            </Button>
          </div>
          {providers.length === 0 ? (
            <SectionCard title={t("还没有供应商")}>
              <div className="empty-state">
                <p className="text-muted">
                  {t("添加一个供应商后，再为翻译和OCR选择模型")}
                </p>
                <Button onPress={() => setEditing(createApiProvider())}>
                  + {t("新建供应商")}
                </Button>
              </div>
            </SectionCard>
          ) : (
            <div className="provider-grid">
              {providers.map((provider) => (
                <Card key={provider.uid}>
                  <Card.Header>
                    <Card.Title>{provider.identifier}</Card.Title>
                    <Card.Description className="break-all">
                      {provider.baseURL || "—"}
                    </Card.Description>
                  </Card.Header>
                  <Card.Content>
                    <Chip size="sm" variant="soft">
                      <Chip.Label>
                        {t("模型数量", { count: provider.models.length })}
                      </Chip.Label>
                    </Chip>
                  </Card.Content>
                  <Card.Footer className="toolbar">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => setEditing(provider)}
                    >
                      {t("编辑")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => copy(provider)}
                    >
                      {t("复制")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-soft"
                      onPress={() => dispatch(removeProvider(provider.uid))}
                    >
                      {t("删除")}
                    </Button>
                  </Card.Footer>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
