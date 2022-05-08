import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ImportType } from 'interfaces';

/**
 * Dialog for creating policy.
 */
@Component({
  selector: 'import-policy-dialog',
  templateUrl: './import-policy-dialog.component.html',
  styleUrls: ['./import-policy-dialog.component.css']
})
export class ImportPolicyDialog {
  importType?: ImportType;
  dataForm = this.fb.group({
    timestamp: ['', Validators.required]
  });
  loading: boolean = false;

  public isImportTypeSelected: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<ImportPolicyDialog>,
    private fb: FormBuilder,
    private policyEngineService: PolicyEngineService,
    @Inject(MAT_DIALOG_DATA) public data: any) {
      if (data.timeStamp) {
        this.importType = ImportType.IPFS;
        this.isImportTypeSelected = true;
        this.dataForm.patchValue({
          timestamp: data.timeStamp
        });
        this.importFromMessage();
      }
  }

  setImportType(importType: ImportType) {
    this.importType = importType;
    this.isImportTypeSelected = true;
  }

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  importFromMessage() {
    if (!this.dataForm.valid) {
      return;
    }

    this.loading = true;
    const messageId = this.dataForm.get('timestamp')?.value;

    this.policyEngineService.previewByMessage(messageId)
      .subscribe(result => {
        this.loading = false;
        this.dialogRef.close({
          type: 'message',
          data: messageId,
          policy: result
        });
      }, error => {
        this.loading = false;
      });
  }

  importFromFile() {
    this.loading = true;

    const pickerOpts = {
      types: [
        {
          accept: {
            'application/zip': ['.zip']
          }
        },
      ],
      excludeAcceptAllOption: true,
      multiple: false
    };

    (window as any).showOpenFilePicker(pickerOpts)
      .then(async ([fileHandler]: any) => {
        const file = await fileHandler.getFile();
        const reader = new FileReader()
        reader.readAsArrayBuffer(file);
        reader.addEventListener('load', (e: any) => {
          const arrayBuffer = e.target.result;
          this.loading = true;
          this.policyEngineService.previewByFile(arrayBuffer).subscribe((result) => {
            this.loading = false;
            this.dialogRef.close({
              type: 'file',
              data: arrayBuffer,
              policy: result
            });
          }, (e) => {
            this.loading = false;
          });
        });
      })
      .catch(() => this.dialogRef.close(null));
  }
}
